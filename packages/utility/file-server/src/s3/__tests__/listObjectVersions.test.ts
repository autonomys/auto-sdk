import {
  buildListVersionsResult,
  computeListObjectVersionsDbLimit,
  finalizeListObjectVersions,
  S3VersionRow,
} from '../listObjectVersions.js'

describe('computeListObjectVersionsDbLimit', () => {
  it('returns maxKeys + 1 to detect truncation from storage', () => {
    expect(computeListObjectVersionsDbLimit(1000)).toBe(1001)
    expect(computeListObjectVersionsDbLimit(10)).toBe(11)
    expect(computeListObjectVersionsDbLimit(1)).toBe(2)
    expect(computeListObjectVersionsDbLimit(0)).toBe(1)
  })
})

describe('buildListVersionsResult', () => {
  const row = (overrides: Partial<S3VersionRow> = {}): S3VersionRow => ({
    key: 'file.txt',
    cid: 'bafk-1',
    lastModified: new Date(1000),
    size: 100n,
    md5: '0123456789abcdef0123456789abcdef',
    pointerDeletedAt: null,
    ownerRemoved: false,
    ...overrides,
  })

  it('returns empty result when given no rows', () => {
    const result = buildListVersionsResult([], 100)
    expect(result).toEqual({
      versions: [],
      deleteMarkers: [],
      isTruncated: false,
      nextKeyMarker: null,
    })
  })

  it('handles a single active key with one version', () => {
    const r = row({ key: 'photo.png', cid: 'bafk-photo', md5: 'deadbeef' })
    const result = buildListVersionsResult([r], 10)

    expect(result.versions).toEqual([
      {
        key: 'photo.png',
        versionId: 'bafk-photo',
        isLatest: true,
        lastModified: r.lastModified,
        etag: '"deadbeef"',
        size: 100n,
      },
    ])
    expect(result.deleteMarkers).toEqual([])
    expect(result.isTruncated).toBe(false)
    expect(result.nextKeyMarker).toBeNull()
  })

  it('falls back to CID for ETag when md5 is null or undefined', () => {
    const r = row({ key: 'legacy.txt', cid: 'bafk-legacy', md5: null })
    const result = buildListVersionsResult([r], 10)

    expect(result.versions[0].etag).toBe('"bafk-legacy"')
  })

  it('marks only the first (newest) version as isLatest for an active key with multiple versions', () => {
    const v3 = row({ key: 'doc.pdf', cid: 'cid-v3', lastModified: new Date(3000) })
    const v2 = row({ key: 'doc.pdf', cid: 'cid-v2', lastModified: new Date(2000) })
    const v1 = row({ key: 'doc.pdf', cid: 'cid-v1', lastModified: new Date(1000) })

    const result = buildListVersionsResult([v3, v2, v1], 10)

    expect(result.versions.map((v) => ({ cid: v.versionId, isLatest: v.isLatest }))).toEqual([
      { cid: 'cid-v3', isLatest: true },
      { cid: 'cid-v2', isLatest: false },
      { cid: 'cid-v1', isLatest: false },
    ])
    expect(result.deleteMarkers).toEqual([])
  })

  it('collapses adjacent repeated same-content writes sharing the same CID under a key', () => {
    const newer = row({
      key: 'config.json',
      cid: 'same-cid',
      lastModified: new Date(2000),
      size: 50n,
    })
    const older = row({
      key: 'config.json',
      cid: 'same-cid',
      lastModified: new Date(1000),
      size: 50n,
    })

    const result = buildListVersionsResult([newer, older], 10)

    expect(result.versions).toHaveLength(1)
    expect(result.versions[0]).toEqual({
      key: 'config.json',
      versionId: 'same-cid',
      isLatest: true,
      lastModified: new Date(2000),
      etag: '"0123456789abcdef0123456789abcdef"',
      size: 50n,
    })
  })

  it('collapses non-adjacent duplicate CIDs under a key, keeping only the newest occurrence', () => {
    const v3 = row({ key: 'notes.txt', cid: 'cid-A', lastModified: new Date(3000) })
    const v2 = row({ key: 'notes.txt', cid: 'cid-B', lastModified: new Date(2000) })
    const v1 = row({ key: 'notes.txt', cid: 'cid-A', lastModified: new Date(1000) })

    const result = buildListVersionsResult([v3, v2, v1], 10)

    expect(result.versions).toHaveLength(2)
    expect(result.versions).toEqual([
      {
        key: 'notes.txt',
        versionId: 'cid-A',
        isLatest: true,
        lastModified: new Date(3000),
        etag: '"0123456789abcdef0123456789abcdef"',
        size: 100n,
      },
      {
        key: 'notes.txt',
        versionId: 'cid-B',
        isLatest: false,
        lastModified: new Date(2000),
        etag: '"0123456789abcdef0123456789abcdef"',
        size: 100n,
      },
    ])
  })

  it('synthesises a delete marker as isLatest when key is soft-deleted', () => {
    const deletedTime = new Date(5000)
    const v2 = row({
      key: 'deleted.txt',
      cid: 'cid-2',
      pointerDeletedAt: deletedTime,
      lastModified: new Date(4000),
    })
    const v1 = row({
      key: 'deleted.txt',
      cid: 'cid-1',
      pointerDeletedAt: deletedTime,
      lastModified: new Date(3000),
    })

    const result = buildListVersionsResult([v2, v1], 10)

    expect(result.deleteMarkers).toEqual([
      {
        key: 'deleted.txt',
        versionId: 'dm-5000',
        isLatest: true,
        lastModified: deletedTime,
      },
    ])
    expect(result.versions.every((v) => v.isLatest === false)).toBe(true)
    expect(result.versions).toHaveLength(2)
  })

  it('synthesises a delete marker falling back to newest version time for owner-removed key', () => {
    const v1 = row({
      key: 'removed.txt',
      cid: 'cid-removed',
      ownerRemoved: true,
      pointerDeletedAt: null,
      lastModified: new Date(4500),
    })

    const result = buildListVersionsResult([v1], 10)

    expect(result.deleteMarkers).toEqual([
      {
        key: 'removed.txt',
        versionId: 'dm-4500',
        isLatest: true,
        lastModified: new Date(4500),
      },
    ])
    expect(result.versions[0].isLatest).toBe(false)
  })

  it('handles both delete signals set at once, preferring pointerDeletedAt timestamp', () => {
    const deletedTime = new Date(6000)
    const v2 = row({
      key: 'both-signals.txt',
      cid: 'cid-both-2',
      ownerRemoved: true,
      pointerDeletedAt: deletedTime,
      lastModified: new Date(5000),
    })
    const v1 = row({
      key: 'both-signals.txt',
      cid: 'cid-both-1',
      ownerRemoved: true,
      pointerDeletedAt: deletedTime,
      lastModified: new Date(4000),
    })

    const result = buildListVersionsResult([v2, v1], 10)

    expect(result.deleteMarkers).toEqual([
      {
        key: 'both-signals.txt',
        versionId: 'dm-6000',
        isLatest: true,
        lastModified: deletedTime,
      },
    ])
    expect(result.versions.every((v) => v.isLatest === false)).toBe(true)
    expect(result.versions).toHaveLength(2)
  })

  it('synthesises a delete marker for owner-removed key with multiple versions', () => {
    const v3 = row({
      key: 'multi-removed.txt',
      cid: 'cid-3',
      ownerRemoved: true,
      pointerDeletedAt: null,
      lastModified: new Date(3000),
    })
    const v2 = row({
      key: 'multi-removed.txt',
      cid: 'cid-2',
      ownerRemoved: true,
      pointerDeletedAt: null,
      lastModified: new Date(2000),
    })
    const v1 = row({
      key: 'multi-removed.txt',
      cid: 'cid-1',
      ownerRemoved: true,
      pointerDeletedAt: null,
      lastModified: new Date(1000),
    })

    const result = buildListVersionsResult([v3, v2, v1], 10)

    expect(result.deleteMarkers).toEqual([
      {
        key: 'multi-removed.txt',
        versionId: 'dm-3000',
        isLatest: true,
        lastModified: new Date(3000),
      },
    ])
    expect(result.versions.every((v) => v.isLatest === false)).toBe(true)
    expect(result.versions).toHaveLength(3)
  })

  it('enforces key-level maxKeys pagination and sets nextKeyMarker', () => {
    const keyA1 = row({ key: 'a.txt', cid: 'a-1' })
    const keyA2 = row({ key: 'a.txt', cid: 'a-2' })
    const keyB1 = row({ key: 'b.txt', cid: 'b-1' })
    const keyC1 = row({ key: 'c.txt', cid: 'c-1' })

    const result = buildListVersionsResult([keyA1, keyA2, keyB1, keyC1], 2)

    expect(result.isTruncated).toBe(true)
    expect(result.nextKeyMarker).toBe('b.txt')
    expect(result.versions.map((v) => v.key)).toEqual(['a.txt', 'a.txt', 'b.txt'])
  })

  it('handles a truncated page ending on a deleted key', () => {
    const deletedTime = new Date(5000)
    const keyA = row({ key: 'a.txt', cid: 'a-1' })
    const keyB = row({
      key: 'b.txt',
      cid: 'b-1',
      pointerDeletedAt: deletedTime,
      lastModified: new Date(4000),
    })
    const keyC = row({ key: 'c.txt', cid: 'c-1' })

    const result = buildListVersionsResult([keyA, keyB, keyC], 2)

    expect(result.isTruncated).toBe(true)
    expect(result.nextKeyMarker).toBe('b.txt')
    expect(result.versions.map((v) => v.key)).toEqual(['a.txt', 'b.txt'])
    expect(result.deleteMarkers).toEqual([
      {
        key: 'b.txt',
        versionId: 'dm-5000',
        isLatest: true,
        lastModified: deletedTime,
      },
    ])
  })

  it('does not truncate when total distinct keys is less than or equal to maxKeys', () => {
    const keyA = row({ key: 'a.txt', cid: 'a-1' })
    const keyB = row({ key: 'b.txt', cid: 'b-1' })

    const result = buildListVersionsResult([keyA, keyB], 2)

    expect(result.isTruncated).toBe(false)
    expect(result.nextKeyMarker).toBeNull()
    expect(result.versions).toHaveLength(2)
  })

  it('handles maxKeys <= 0 gracefully without crashing', () => {
    const keyA = row({ key: 'a.txt', cid: 'a-1' })
    const result = buildListVersionsResult([keyA], 0)

    expect(result.isTruncated).toBe(true)
    expect(result.nextKeyMarker).toBeNull()
    expect(result.versions).toEqual([])
    expect(result.deleteMarkers).toEqual([])
  })
})

describe('finalizeListObjectVersions', () => {
  const row = (key: string, cid: string): S3VersionRow => ({
    key,
    cid,
    lastModified: new Date(1000),
    size: 50n,
    md5: 'md5hash',
    pointerDeletedAt: null,
    ownerRemoved: false,
  })

  it('constructs a non-truncated response when rows are within limits', () => {
    const rows = [row('a.txt', 'cid-a'), row('b.txt', 'cid-b')]
    const params = {
      bucket: 'test-bucket',
      prefix: '',
      keyMarker: null,
      maxKeys: 10,
    }

    const result = finalizeListObjectVersions(params, rows, 11)

    expect(result.name).toBe('test-bucket')
    expect(result.prefix).toBe('')
    expect(result.keyMarker).toBeNull()
    expect(result.maxKeys).toBe(10)
    expect(result.isTruncated).toBe(false)
    expect(result.nextKeyMarker).toBeNull()
    expect(result.versions).toHaveLength(2)
    expect(result.deleteMarkers).toHaveLength(0)
  })

  it('sets isTruncated and nextKeyMarker when storage returned a full batch of distinct keys (distinctKeys >= dbLimit)', () => {
    const rows = [row('a.txt', 'cid-a'), row('b.txt', 'cid-b'), row('c.txt', 'cid-c')]
    const params = {
      bucket: 'test-bucket',
      prefix: '',
      keyMarker: null,
      maxKeys: 2,
    }
    const dbLimit = computeListObjectVersionsDbLimit(params.maxKeys) // 3

    const result = finalizeListObjectVersions(params, rows, dbLimit)

    expect(result.isTruncated).toBe(true)
    expect(result.nextKeyMarker).toBe('b.txt')
    expect(result.versions.map((v) => v.key)).toEqual(['a.txt', 'b.txt'])
  })
})
