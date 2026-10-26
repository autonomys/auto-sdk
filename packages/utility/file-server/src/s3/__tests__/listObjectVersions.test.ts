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
    const r = row({ id: '1', key: 'photo.png', cid: 'bafk-photo', md5: 'deadbeef' })
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
    const r = row({ id: '1', key: 'legacy.txt', cid: 'bafk-legacy', md5: null })
    const result = buildListVersionsResult([r], 10)

    expect(result.versions[0].etag).toBe('"bafk-legacy"')
  })

  it('marks only the first (newest) version as isLatest for an active key with multiple versions', () => {
    const v3 = row({ id: '3', key: 'doc.pdf', cid: 'cid-v3', lastModified: new Date(3000) })
    const v2 = row({ id: '2', key: 'doc.pdf', cid: 'cid-v2', lastModified: new Date(2000) })
    const v1 = row({ id: '1', key: 'doc.pdf', cid: 'cid-v1', lastModified: new Date(1000) })

    const result = buildListVersionsResult([v3, v2, v1], 10)

    expect(result.versions.map((v) => ({ cid: v.versionId, isLatest: v.isLatest }))).toEqual([
      { cid: 'cid-v3', isLatest: true },
      { cid: 'cid-v2', isLatest: false },
      { cid: 'cid-v1', isLatest: false },
    ])
    expect(result.deleteMarkers).toEqual([])
  })

  it('synthesises a delete marker as latest for a soft-deleted key (pointerDeletedAt set)', () => {
    const deletedTime = new Date(5000)
    const v2 = row({
      id: '2',
      key: 'deleted.txt',
      cid: 'cid-v2',
      lastModified: new Date(2000),
      pointerDeletedAt: deletedTime,
    })
    const v1 = row({
      id: '1',
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
      id: '1',
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
      id: '2',
      key: 'single-dm.txt',
      cid: 'cid-2',
      pointerDeletedAt: deletedTime,
    })
    const v1 = row({
      id: '1',
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
      id: '3',
      key: 'multi-removed.txt',
      cid: 'cid-3',
      lastModified: new Date(3000),
      ownerRemoved: true,
      pointerDeletedAt: null,
    })
    const v2 = row({
      id: '2',
      key: 'multi-removed.txt',
      cid: 'cid-2',
      lastModified: new Date(2000),
      ownerRemoved: true,
      pointerDeletedAt: null,
    })
    const v1 = row({
      id: '1',
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
    const keyA1 = row({ id: '2', key: 'a.txt', cid: 'a-1' })
    const keyA2 = row({ id: '1', key: 'a.txt', cid: 'a-2' })
    const keyB1 = row({ id: '3', key: 'b.txt', cid: 'b-1' })
    const keyC1 = row({ id: '4', key: 'c.txt', cid: 'c-1' })

    const result = buildListVersionsResult([keyA1, keyA2, keyB1, keyC1], 2)

    expect(result.isTruncated).toBe(true)
    expect(result.nextKeyMarker).toBe('a.txt')
    expect(result.nextVersionIdMarker).toBe('1')
    expect(result.versions.map((v) => v.versionId)).toEqual(['a-1', 'a-2'])
  })

  it('resumes mid-key with keyMarker and versionIdMarker without duplicating delete marker', () => {
    const keyA1 = row({ id: '2', key: 'a.txt', cid: 'a-1', pointerDeletedAt: new Date(5000) })
    const keyA2 = row({ id: '1', key: 'a.txt', cid: 'a-2', pointerDeletedAt: new Date(5000) })

    // Page 1 with maxKeys: 1 emits only the synthesized delete marker
    const page1 = buildListVersionsResult([keyA1, keyA2], 1)
    expect(page1.deleteMarkers).toHaveLength(1)
    expect(page1.versions).toHaveLength(0)
    expect(page1.isTruncated).toBe(true)
    expect(page1.nextKeyMarker).toBe('a.txt')
    // Cursor points to BigInt(firstRowId) + BigInt(1) so storage can resume at firstRowId inclusive
    expect(page1.nextVersionIdMarker).toBe('3')

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
    const keyA = row({ id: '3', key: 'a.txt', cid: 'a-1' })
    const keyB = row({
      id: '2',
      key: 'b.txt',
      cid: 'b-1',
      pointerDeletedAt: deletedTime,
      lastModified: new Date(4000),
    })
    const keyC = row({ id: '1', key: 'c.txt', cid: 'c-1' })

    const result = buildListVersionsResult([keyA, keyB, keyC], 2)

    expect(result.isTruncated).toBe(true)
    expect(result.nextKeyMarker).toBe('b.txt')
    expect(result.nextVersionIdMarker).toBe('3') // BigInt(firstRowId '2') + BigInt(1)
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
    const keyA = row({ id: '2', key: 'a.txt', cid: 'a-1' })
    const keyB = row({ id: '1', key: 'b.txt', cid: 'b-1' })

    const result = buildListVersionsResult([keyA, keyB], 2)

    expect(result.isTruncated).toBe(false)
    expect(result.nextKeyMarker).toBeNull()
    expect(result.nextVersionIdMarker).toBeNull()
    expect(result.versions).toHaveLength(2)
  })

  it('handles maxKeys <= 0 gracefully without crashing', () => {
    const keyA = row({ id: '1', key: 'a.txt', cid: 'a-1' })
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
    const rows = [row('a.txt', 'cid-a', '2'), row('b.txt', 'cid-b', '1')]
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
    const rows = [
      row('a.txt', 'cid-a', '3'),
      row('b.txt', 'cid-b', '2'),
      row('c.txt', 'cid-c', '1'),
    ]
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
    const rows = [row('a.txt', 'cid-a', '2'), row('b.txt', 'cid-b', '1')]
    const params = {
      bucket: 'test-bucket',
      prefix: '',
      keyMarker: null,
      maxKeys: 2,
    }
    const result = finalizeListObjectVersions(params, rows, 2)

    expect(result.isTruncated).toBe(true)
    expect(result.nextKeyMarker).toBe('b.txt')
    expect(result.nextVersionIdMarker).toBe('1')
  })
})

describe('simulated storage paging against acceptance criteria (#790)', () => {
  // Raw storage rows before SQL-level DISTINCT ON (key, cid) deduplication.
  // In the database, IDs are monotonic auto-incrementing integers (newest write has highest ID).
  const rawDataset: S3VersionRow[] = [
    // Deleted key with multiple versions and a repeated CID
    {
      id: '12',
      key: 'archive.tar',
      cid: 'cid-tar-3',
      lastModified: new Date(3000),
      size: 300n,
      md5: 'md5-3',
      pointerDeletedAt: new Date(6000),
      ownerRemoved: false,
    },
    {
      id: '11',
      key: 'archive.tar',
      cid: 'cid-tar-2',
      lastModified: new Date(2000),
      size: 200n,
      md5: 'md5-2',
      pointerDeletedAt: new Date(6000),
      ownerRemoved: false,
    },
    // Repeated CID write for archive.tar (older duplicate with lower id)
    {
      id: '10',
      key: 'archive.tar',
      cid: 'cid-tar-3',
      lastModified: new Date(1500),
      size: 300n,
      md5: 'md5-3',
      pointerDeletedAt: new Date(6000),
      ownerRemoved: false,
    },
    {
      id: '9',
      key: 'archive.tar',
      cid: 'cid-tar-1',
      lastModified: new Date(1000),
      size: 100n,
      md5: 'md5-1',
      pointerDeletedAt: new Date(6000),
      ownerRemoved: false,
    },

    // Active key with multiple versions
    {
      id: '8',
      key: 'data.csv',
      cid: 'cid-csv-2',
      lastModified: new Date(2500),
      size: 250n,
      md5: 'md5-csv2',
      pointerDeletedAt: null,
      ownerRemoved: false,
    },
    {
      id: '7',
      key: 'data.csv',
      cid: 'cid-csv-1',
      lastModified: new Date(1200),
      size: 120n,
      md5: 'md5-csv1',
      pointerDeletedAt: null,
      ownerRemoved: false,
    },

    // Single version active key
    {
      id: '6',
      key: 'logo.png',
      cid: 'cid-png-1',
      lastModified: new Date(800),
      size: 80n,
      md5: 'md5-png',
      pointerDeletedAt: null,
      ownerRemoved: false,
    },

    // Active key with repeated CID
    {
      id: '5',
      key: 'notes.txt',
      cid: 'cid-notes-2',
      lastModified: new Date(4000),
      size: 40n,
      md5: 'md5-notes2',
      pointerDeletedAt: null,
      ownerRemoved: false,
    },
    {
      id: '4',
      key: 'notes.txt',
      cid: 'cid-notes-1',
      lastModified: new Date(2000),
      size: 20n,
      md5: 'md5-notes1',
      pointerDeletedAt: null,
      ownerRemoved: false,
    },
    {
      id: '3',
      key: 'notes.txt',
      cid: 'cid-notes-2',
      lastModified: new Date(500),
      size: 40n,
      md5: 'md5-notes2',
      pointerDeletedAt: null,
      ownerRemoved: false,
    },

    // Owner-removed key
    {
      id: '2',
      key: 'trashed.doc',
      cid: 'cid-trash-1',
      lastModified: new Date(3500),
      size: 500n,
      md5: 'md5-trash',
      pointerDeletedAt: null,
      ownerRemoved: true,
    },
  ]

  // Simulate storage contract:
  // 1. One row per (key, cid) keeping the newest row per (key, cid) (highest id)
  // 2. Ordered by key ASC, then newest version first per key (id DESC)
  const deduplicatedStorageRows: S3VersionRow[] = (() => {
    const seen = new Set<string>()
    const sorted = [...rawDataset].sort((a, b) => {
      const keyCmp = a.key.localeCompare(b.key)
      if (keyCmp !== 0) return keyCmp
      return Number(BigInt(b.id) - BigInt(a.id))
    })
    const deduped: S3VersionRow[] = []
    for (const r of sorted) {
      const keyCid = `${r.key}:::${r.cid}`
      if (!seen.has(keyCid)) {
        seen.add(keyCid)
        deduped.push(r)
      }
    }
    return deduped
  })()

  // Storage query simulator: filters by `key > km OR (key = km AND id < idm)`
  const queryStorage = (
    keyMarker: string | null,
    versionIdMarker: string | null,
    limit: number,
  ): S3VersionRow[] => {
    return deduplicatedStorageRows
      .filter((r) => {
        if (keyMarker === null) return true
        if (r.key > keyMarker) return true
        if (r.key === keyMarker && versionIdMarker !== null) {
          return BigInt(r.id) < BigInt(versionIdMarker)
        }
        return false
      })
      .slice(0, limit)
  }

  // Baseline: single unbounded listing across all deduplicated rows
  const baselineResult = finalizeListObjectVersions(
    {
      bucket: 'test-bucket',
      prefix: '',
      keyMarker: null,
      versionIdMarker: null,
      maxKeys: 1000,
    },
    deduplicatedStorageRows,
    deduplicatedStorageRows.length + 1,
  )

  it('matches baseline exactly across every page size from 1 to fixture size without dropping or duplicating versions', () => {
    const totalEntries = baselineResult.versions.length + baselineResult.deleteMarkers.length

    for (let maxKeys = 1; maxKeys <= totalEntries + 2; maxKeys++) {
      const pagedVersions = []
      const pagedDeleteMarkers = []
      let currentKeyMarker: string | null = null
      let currentVersionIdMarker: string | null = null
      let iterations = 0

      while (true) {
        iterations++
        if (iterations > 100) {
          throw new Error(`Infinite pagination loop detected at maxKeys = ${maxKeys}`)
        }

        const dbLimit = computeListObjectVersionsDbLimit(maxKeys)
        const rows = queryStorage(currentKeyMarker, currentVersionIdMarker, dbLimit)
        const page = finalizeListObjectVersions(
          {
            bucket: 'test-bucket',
            prefix: '',
            keyMarker: currentKeyMarker,
            versionIdMarker: currentVersionIdMarker,
            maxKeys,
          },
          rows,
          dbLimit,
        )

        pagedVersions.push(...page.versions)
        pagedDeleteMarkers.push(...page.deleteMarkers)

        if (!page.isTruncated) {
          break
        }

        expect(page.nextKeyMarker).not.toBeNull()
        currentKeyMarker = page.nextKeyMarker
        currentVersionIdMarker = page.nextVersionIdMarker
      }

      // Assert complete equality with baseline unbounded listing
      expect(pagedVersions).toEqual(baselineResult.versions)
      expect(pagedDeleteMarkers).toEqual(baselineResult.deleteMarkers)
    }
  })
})
