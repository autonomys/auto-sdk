import {
  buildListVersionsResult,
  deleteMarkerVersionId,
  resolveDeleteMarkerResult,
  S3VersionRow,
} from '../listObjectVersions.js'

describe('deleteMarkerVersionId', () => {
  it('formats delete marker version ID from date timestamp', () => {
    const date = new Date(1700000000000)
    expect(deleteMarkerVersionId(date)).toBe('dm-1700000000000')
  })
})

describe('resolveDeleteMarkerResult', () => {
  it('returns deleteMarker: true and formatted versionId when deletedAt is present', () => {
    const date = new Date(1710000000000)
    expect(resolveDeleteMarkerResult(date)).toEqual({
      deleteMarker: true,
      versionId: 'dm-1710000000000',
    })
  })

  it('returns deleteMarker: false and versionId: null when deletedAt is null', () => {
    expect(resolveDeleteMarkerResult(null)).toEqual({
      deleteMarker: false,
      versionId: null,
    })
  })

  it('returns deleteMarker: false and versionId: null when deletedAt is undefined', () => {
    expect(resolveDeleteMarkerResult(undefined)).toEqual({
      deleteMarker: false,
      versionId: null,
    })
  })
})

describe('buildListVersionsResult', () => {
  const row = (overrides: Partial<S3VersionRow> = {}): S3VersionRow => ({
    key: 'file.txt',
    cid: 'bafk-1',
    lastModified: new Date(1000),
    size: 100n,
    md5: '0123456789abcdef0123456789abcdef',
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

  it('collapses repeated same-content writes sharing the same CID under a key', () => {
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
