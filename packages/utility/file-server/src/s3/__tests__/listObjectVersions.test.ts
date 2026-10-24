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
    id: '1',
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
      nextVersionIdMarker: null,
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
    expect(result.nextVersionIdMarker).toBeNull()
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
      lastModified: newer.lastModified,
      etag: '"0123456789abcdef0123456789abcdef"',
      size: 50n,
    })
    expect(result.deleteMarkers).toEqual([])
  })

  it('collapses non-adjacent repeated writes sharing the same CID under a key', () => {
    const v3 = row({
      key: 'toggle.txt',
      cid: 'cid-A',
      lastModified: new Date(3000),
      size: 10n,
    })
    const v2 = row({
      key: 'toggle.txt',
      cid: 'cid-B',
      lastModified: new Date(2000),
      size: 20n,
    })
    const v1 = row({
      key: 'toggle.txt',
      cid: 'cid-A',
      lastModified: new Date(1000),
      size: 10n,
    })

    const result = buildListVersionsResult([v3, v2, v1], 10)

    expect(result.versions.map((v) => ({ cid: v.versionId, lastModified: v.lastModified }))).toEqual([
      { cid: 'cid-A', lastModified: new Date(3000) },
      { cid: 'cid-B', lastModified: new Date(2000) },
    ])
    expect(result.versions[0].isLatest).toBe(true)
    expect(result.versions[1].isLatest).toBe(false)
  })

  it('synthesises a delete marker as latest for a soft-deleted key (pointerDeletedAt set)', () => {
    const deletedTime = new Date(5000)
    const v2 = row({
      key: 'deleted.txt',
      cid: 'cid-v2',
      lastModified: new Date(2000),
      pointerDeletedAt: deletedTime,
    })
    const v1 = row({
      key: 'deleted.txt',
      cid: 'cid-v1',
      lastModified: new Date(1000),
      pointerDeletedAt: deletedTime,
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

  it('synthesises a delete marker for an owner-removed key using newest version time when deleted_at is null', () => {
    const v1 = row({
      key: 'moderated.txt',
      cid: 'cid-v1',
      lastModified: new Date(1500),
      pointerDeletedAt: null,
      ownerRemoved: true,
    })

    const result = buildListVersionsResult([v1], 10)

    expect(result.deleteMarkers).toEqual([
      {
        key: 'moderated.txt',
        versionId: 'dm-1500',
        isLatest: true,
        lastModified: new Date(1500),
      },
    ])
    expect(result.versions[0].isLatest).toBe(false)
  })

  it('synthesises only ONE delete marker per deleted key even across multiple versions', () => {
    const deletedTime = new Date(9999)
    const v2 = row({
      key: 'single-dm.txt',
      cid: 'cid-2',
      pointerDeletedAt: deletedTime,
    })
    const v1 = row({
      key: 'single-dm.txt',
      cid: 'cid-1',
      pointerDeletedAt: deletedTime,
    })

    const result = buildListVersionsResult([v2, v1], 10)

    expect(result.deleteMarkers).toHaveLength(1)
    expect(result.deleteMarkers[0].key).toBe('single-dm.txt')
  })

  it('synthesises only ONE delete marker for an owner-removed key with multiple versions and null deleted_at', () => {
    const v3 = row({
      key: 'multi-removed.txt',
      cid: 'cid-3',
      lastModified: new Date(3000),
      ownerRemoved: true,
      pointerDeletedAt: null,
    })
    const v2 = row({
      key: 'multi-removed.txt',
      cid: 'cid-2',
      lastModified: new Date(2000),
      ownerRemoved: true,
      pointerDeletedAt: null,
    })
    const v1 = row({
      key: 'multi-removed.txt',
      cid: 'cid-1',
      lastModified: new Date(1000),
      ownerRemoved: true,
      pointerDeletedAt: null,
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

  it('enforces entry-level maxKeys pagination and sets nextKeyMarker and nextVersionIdMarker', () => {
    const keyA1 = row({ id: '1', key: 'a.txt', cid: 'a-1' })
    const keyA2 = row({ id: '2', key: 'a.txt', cid: 'a-2' })
    const keyB1 = row({ id: '3', key: 'b.txt', cid: 'b-1' })
    const keyC1 = row({ id: '4', key: 'c.txt', cid: 'c-1' })

    const result = buildListVersionsResult([keyA1, keyA2, keyB1, keyC1], 2)

    expect(result.isTruncated).toBe(true)
    expect(result.nextKeyMarker).toBe('a.txt')
    expect(result.nextVersionIdMarker).toBe('2')
    expect(result.versions.map((v) => v.versionId)).toEqual(['a-1', 'a-2'])
  })

  it('resumes mid-key with keyMarker and versionIdMarker without duplicating delete marker', () => {
    const keyA1 = row({ id: '1', key: 'a.txt', cid: 'a-1', pointerDeletedAt: new Date(5000) })
    const keyA2 = row({ id: '2', key: 'a.txt', cid: 'a-2', pointerDeletedAt: new Date(5000) })

    // Page 1 with maxKeys: 1 emits only the synthesized delete marker
    const page1 = buildListVersionsResult([keyA1, keyA2], 1)
    expect(page1.deleteMarkers).toHaveLength(1)
    expect(page1.versions).toHaveLength(0)
    expect(page1.isTruncated).toBe(true)
    expect(page1.nextKeyMarker).toBe('a.txt')
    expect(page1.nextVersionIdMarker).toBe('dm-5000')

    // Page 2 resumes mid-key: does not emit delete marker again, emits content versions
    const page2 = buildListVersionsResult([keyA1, keyA2], 10, {
      keyMarker: page1.nextKeyMarker,
      versionIdMarker: page1.nextVersionIdMarker,
    })
    expect(page2.deleteMarkers).toHaveLength(0)
    expect(page2.versions).toHaveLength(2)
    expect(page2.versions[0].isLatest).toBe(false)
    expect(page2.isTruncated).toBe(false)
  })

  it('handles a truncated page ending on a deleted key', () => {
    const deletedTime = new Date(5000)
    const keyA = row({ id: '1', key: 'a.txt', cid: 'a-1' })
    const keyB = row({
      id: '2',
      key: 'b.txt',
      cid: 'b-1',
      pointerDeletedAt: deletedTime,
      lastModified: new Date(4000),
    })
    const keyC = row({ id: '3', key: 'c.txt', cid: 'c-1' })

    const result = buildListVersionsResult([keyA, keyB, keyC], 2)

    expect(result.isTruncated).toBe(true)
    expect(result.nextKeyMarker).toBe('b.txt')
    expect(result.nextVersionIdMarker).toBe('dm-5000')
    expect(result.versions.map((v) => v.key)).toEqual(['a.txt'])
    expect(result.deleteMarkers).toEqual([
      {
        key: 'b.txt',
        versionId: 'dm-5000',
        isLatest: true,
        lastModified: deletedTime,
      },
    ])
  })

  it('does not truncate when total entries is less than or equal to maxKeys', () => {
    const keyA = row({ id: '1', key: 'a.txt', cid: 'a-1' })
    const keyB = row({ id: '2', key: 'b.txt', cid: 'b-1' })

    const result = buildListVersionsResult([keyA, keyB], 2)

    expect(result.isTruncated).toBe(false)
    expect(result.nextKeyMarker).toBeNull()
    expect(result.nextVersionIdMarker).toBeNull()
    expect(result.versions).toHaveLength(2)
  })

  it('handles maxKeys <= 0 gracefully without crashing', () => {
    const keyA = row({ key: 'a.txt', cid: 'a-1' })
    const result = buildListVersionsResult([keyA], 0)

    expect(result.isTruncated).toBe(true)
    expect(result.nextKeyMarker).toBeNull()
    expect(result.nextVersionIdMarker).toBeNull()
    expect(result.versions).toEqual([])
    expect(result.deleteMarkers).toEqual([])
  })
})

describe('finalizeListObjectVersions', () => {
  const row = (key: string, cid: string, id: string = '1'): S3VersionRow => ({
    id,
    key,
    cid,
    lastModified: new Date(1000),
    size: 50n,
    md5: 'md5hash',
    pointerDeletedAt: null,
    ownerRemoved: false,
  })

  it('constructs a non-truncated response when rows are within limits', () => {
    const rows = [row('a.txt', 'cid-a', '1'), row('b.txt', 'cid-b', '2')]
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
    expect(result.versionIdMarker).toBeNull()
    expect(result.maxKeys).toBe(10)
    expect(result.isTruncated).toBe(false)
    expect(result.nextKeyMarker).toBeNull()
    expect(result.nextVersionIdMarker).toBeNull()
    expect(result.versions).toHaveLength(2)
    expect(result.deleteMarkers).toHaveLength(0)
  })

  it('sets isTruncated and markers when rows exceed maxKeys', () => {
    const rows = [row('a.txt', 'cid-a', '1'), row('b.txt', 'cid-b', '2'), row('c.txt', 'cid-c', '3')]
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
    expect(result.nextVersionIdMarker).toBe('2')
    expect(result.versions.map((v) => v.key)).toEqual(['a.txt', 'b.txt'])
  })

  it('sets isTruncated and markers when caller under-fetched (rows >= dbLimit)', () => {
    const rows = [row('a.txt', 'cid-a', '1'), row('b.txt', 'cid-b', '2')]
    const params = {
      bucket: 'test-bucket',
      prefix: '',
      keyMarker: null,
      maxKeys: 2,
    }
    const result = finalizeListObjectVersions(params, rows, 2)

    expect(result.isTruncated).toBe(true)
    expect(result.nextKeyMarker).toBe('b.txt')
    expect(result.nextVersionIdMarker).toBe('2')
  })
})
