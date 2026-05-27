import {
  buildListResult,
  computeListObjectsDbLimit,
  finalizeListObjects,
  ListObjectsParams,
  S3ObjectListing,
} from '../listObjects.js'

const obj = (key: string): S3ObjectListing => ({
  key,
  cid: `cid-${key}`,
  size: 0n,
  lastModified: new Date(0),
})

const rows = (...keys: string[]): S3ObjectListing[] => keys.map(obj)

describe('computeListObjectsDbLimit', () => {
  it('fetches maxKeys + 1 when there is no delimiter', () => {
    expect(computeListObjectsDbLimit(100, null)).toBe(101)
  })

  it('over-fetches by 10x + 100 when a delimiter is set', () => {
    expect(computeListObjectsDbLimit(100, '/')).toBe(1100)
  })

  it('clamps the delimiter over-fetch at 10,000', () => {
    expect(computeListObjectsDbLimit(100_000, '/')).toBe(10_000)
  })
})

describe('buildListResult', () => {
  it('returns all objects when under maxKeys and no delimiter', () => {
    const result = buildListResult(rows('a', 'b', 'c'), '', null, 10)
    expect(result.objects.map((o) => o.key)).toEqual(['a', 'b', 'c'])
    expect(result.commonPrefixes).toEqual([])
    expect(result.isTruncated).toBe(false)
    expect(result.nextContinuationToken).toBeNull()
  })

  it('truncates and sets the continuation token when over maxKeys', () => {
    const result = buildListResult(rows('a', 'b', 'c', 'd'), '', null, 2)
    expect(result.objects.map((o) => o.key)).toEqual(['a', 'b'])
    expect(result.isTruncated).toBe(true)
    expect(result.nextContinuationToken).toBe('b')
  })

  it('folds keys containing the delimiter into common prefixes', () => {
    const result = buildListResult(rows('a/1', 'a/2', 'b/1', 'c'), '', '/', 10)
    expect(result.objects.map((o) => o.key)).toEqual(['c'])
    expect(result.commonPrefixes).toEqual(['a/', 'b/'])
    expect(result.isTruncated).toBe(false)
  })

  it('folds correctly with a multi-character delimiter', () => {
    const result = buildListResult(rows('a::1', 'a::2', 'b::1', 'c'), '', '::', 10)
    expect(result.objects.map((o) => o.key)).toEqual(['c'])
    expect(result.commonPrefixes).toEqual(['a::', 'b::'])
  })

  it('respects the prefix when computing folded prefixes', () => {
    const result = buildListResult(rows('docs/a/1', 'docs/a/2', 'docs/b'), 'docs/', '/', 10)
    expect(result.objects.map((o) => o.key)).toEqual(['docs/b'])
    expect(result.commonPrefixes).toEqual(['docs/a/'])
  })

  it('counts objects and common prefixes together against maxKeys', () => {
    const result = buildListResult(rows('a/1', 'b/1', 'c/1'), '', '/', 2)
    expect(result.commonPrefixes).toEqual(['a/', 'b/'])
    expect(result.objects).toEqual([])
    expect(result.isTruncated).toBe(true)
    // Token falls before the 'c/' group so the next page re-processes it.
    expect(result.nextContinuationToken).toBe('b/1')
  })

  it('does not double-count an already-seen common prefix against maxKeys', () => {
    const result = buildListResult(rows('a/1', 'a/2', 'a/3', 'b'), '', '/', 2)
    expect(result.commonPrefixes).toEqual(['a/'])
    expect(result.objects.map((o) => o.key)).toEqual(['b'])
    expect(result.isTruncated).toBe(false)
  })

  it('does not crash and returns no entries when maxKeys is 0', () => {
    // MaxKeys=0 is a valid S3 existence probe. The loop breaks before scanning
    // anything, so there is no prior key to build a continuation token from.
    const result = buildListResult(rows('a', 'b', 'c'), '', null, 0)
    expect(result.objects).toEqual([])
    expect(result.commonPrefixes).toEqual([])
    expect(result.isTruncated).toBe(true)
    expect(result.nextContinuationToken).toBeNull()
  })

  it('handles an empty input', () => {
    const result = buildListResult([], '', '/', 10)
    expect(result.objects).toEqual([])
    expect(result.commonPrefixes).toEqual([])
    expect(result.isTruncated).toBe(false)
    expect(result.nextContinuationToken).toBeNull()
  })
})

describe('finalizeListObjects', () => {
  const params = (overrides: Partial<ListObjectsParams> = {}): ListObjectsParams => ({
    bucket: 'my-bucket',
    prefix: '',
    delimiter: '/',
    maxKeys: 10,
    continuationToken: null,
    ...overrides,
  })

  it('wraps buildListResult with bucket name, prefix and maxKeys', () => {
    const p = params({ delimiter: null, maxKeys: 5 })
    const dbLimit = computeListObjectsDbLimit(p.maxKeys, p.delimiter)
    const result = finalizeListObjects(p, rows('a', 'b'), dbLimit)
    expect(result.name).toBe('my-bucket')
    expect(result.prefix).toBe('')
    expect(result.maxKeys).toBe(5)
    expect(result.objects.map((o) => o.key)).toEqual(['a', 'b'])
    expect(result.isTruncated).toBe(false)
  })

  it('forces truncation with a sentinel token when a full batch folds entirely into one prefix', () => {
    // Every fetched row folds into 'a/' and none break the maxKeys cap, so
    // buildListResult alone would wrongly report isTruncated=false. The full
    // batch (fetchedRows.length === dbLimit) signals there may be more.
    const p = params({ maxKeys: 10 })
    const fetched = rows('a/1', 'a/2', 'a/3')
    const dbLimit = fetched.length
    const result = finalizeListObjects(p, fetched, dbLimit)
    expect(result.isTruncated).toBe(true)
    expect(result.nextContinuationToken).toBe('a/￿')
    expect(result.commonPrefixes).toEqual(['a/'])
  })

  it('builds the sentinel token with the full multi-character delimiter', () => {
    const p = params({ delimiter: '::', maxKeys: 10 })
    const fetched = rows('a::1', 'a::2', 'a::3')
    const result = finalizeListObjects(p, fetched, fetched.length)
    expect(result.isTruncated).toBe(true)
    expect(result.nextContinuationToken).toBe('a::￿')
    expect(result.commonPrefixes).toEqual(['a::'])
  })

  it('uses the last key as the token when the override fires without a delimiter', () => {
    const p = params({ delimiter: null, maxKeys: 10 })
    const fetched = rows('x', 'y')
    const result = finalizeListObjects(p, fetched, fetched.length)
    expect(result.isTruncated).toBe(true)
    expect(result.nextContinuationToken).toBe('y')
  })

  it('uses the last key as the token when the last key does not fold', () => {
    const p = params({ maxKeys: 10 })
    // 'z' has no delimiter after the prefix, so it is not part of a prefix group.
    const fetched = rows('a/1', 'z')
    const result = finalizeListObjects(p, fetched, fetched.length)
    expect(result.isTruncated).toBe(true)
    expect(result.nextContinuationToken).toBe('z')
  })

  it('does not override when the batch was not full', () => {
    const p = params({ maxKeys: 10 })
    const fetched = rows('a/1', 'a/2')
    // dbLimit larger than fetched → storage returned everything, no more pages.
    const result = finalizeListObjects(p, fetched, 100)
    expect(result.isTruncated).toBe(false)
    expect(result.nextContinuationToken).toBeNull()
  })
})
