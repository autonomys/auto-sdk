import { deleteMarkerVersionId } from './deleteMarker.js'
import { objectETag } from './etag.js'

// ── ListObjectVersions ─────────────────────────────────────────────────────

/** A single version entry returned by ListObjectVersions. */
export interface S3VersionEntry {
  key: string
  /** versionId = the content CID. */
  versionId: string
  isLatest: boolean
  lastModified: Date
  /** Quoted ETag: the MD5 when known, else the CID (matching ListObjects). */
  etag: string
  size: bigint
}

/** A single delete marker entry returned by ListObjectVersions. */
export interface S3DeleteMarkerEntry {
  key: string
  versionId: string
  isLatest: boolean
  lastModified: Date
}

/** Parameters for ListObjectVersions query. */
export interface ListObjectVersionsParams {
  bucket: string
  prefix: string
  keyMarker: string | null
  maxKeys: number
}

/** The complete result of ListObjectVersions. */
export interface ListObjectVersionsResult {
  name: string
  prefix: string
  maxKeys: number
  keyMarker: string | null
  isTruncated: boolean
  nextKeyMarker: string | null
  versions: S3VersionEntry[]
  deleteMarkers: S3DeleteMarkerEntry[]
}

/** Raw database/storage row representation before version aggregation. */
export interface S3VersionRow {
  key: string
  cid: string
  /**
   * Deletion timestamp for soft-deleted mappings.
   * Key-level delete state read from the first row of each key and assumed constant across all versions in that key's group.
   */
  pointerDeletedAt: Date | null
  /**
   * Whether the object has been owner-removed (moved to Trash or moderated).
   * Key-level moderation state read from the first row of each key and assumed constant across all versions in that key's group.
   */
  ownerRemoved: boolean
  lastModified: Date
  md5?: string | null
  size: bigint
}

/**
 * How many distinct keys to fetch from storage for a given ListObjectVersions page.
 *
 * We need maxKeys + 1 distinct keys so that buildListVersionsResult or
 * finalizeListObjectVersions can detect whether more keys exist beyond maxKeys.
 */
export const computeListObjectVersionsDbLimit = (maxKeys: number): number => maxKeys + 1

/**
 * Apply version deduplication, soft-delete detection, and maxKeys pagination to
 * sorted storage rows.
 *
 * Rows must arrive ordered by key ascending, then newest version first per key.
 *
 * Precondition: To accurately detect truncation without reading the entire table,
 * `rows` must contain up to `maxKeys + 1` distinct keys (see {@link computeListObjectVersionsDbLimit}).
 *
 * KNOWN LIMITATION (#790): maxKeys bounds the number of distinct keys returned,
 * not the total number of Version + DeleteMarker entries. In S3, max-keys is an
 * entry-level bound, with NextVersionIdMarker resuming mid-key. Here, whole keys
 * are kept together so no version history is split across page boundaries without
 * an entry-level cursor, and there is no version-id-marker resume. A key with
 * many versions can thus yield a page with > maxKeys entries.
 *
 * - IsLatest marks the current content version of each live key.
 * - For a key that is soft-deleted OR owner-removed, a delete marker is
 *   synthesised as the latest entry instead (derived from deleteMarkerVersionId).
 * - Repeated same-content writes sharing the same CID under a single key are
 *   collapsed to one version, keeping the newest occurrence.
 * - Whole keys are kept together: pagination bounds distinct keys, emitting
 *   `nextKeyMarker` when more keys remain beyond `maxKeys`.
 *
 * @param rows - Sorted version rows from storage (up to maxKeys + 1 distinct keys).
 * @param maxKeys - Maximum number of distinct keys to return in this page.
 * @returns Filtered versions, deleteMarkers, isTruncated, and nextKeyMarker.
 */
export const buildListVersionsResult = (
  rows: S3VersionRow[],
  maxKeys: number,
): Pick<
  ListObjectVersionsResult,
  'versions' | 'deleteMarkers' | 'isTruncated' | 'nextKeyMarker'
> => {
  const versions: S3VersionEntry[] = []
  const deleteMarkers: S3DeleteMarkerEntry[] = []
  let keysEmitted = 0
  let lastKey: string | null = null
  let isTruncated = false

  let i = 0
  while (i < rows.length) {
    const key = rows[i].key

    // New key: enforce the maxKeys page limit before emitting its group.
    if (keysEmitted >= maxKeys) {
      isTruncated = true
      break
    }

    // The key's current state is a delete marker (no content version is IsLatest)
    // when the pointer is soft-deleted OR the content is owner-removed.
    const pointerDeletedAt = rows[i].pointerDeletedAt
    const isDeleted = pointerDeletedAt != null || Boolean(rows[i].ownerRemoved)
    const newestVersionTime = rows[i].lastModified

    // versionId = CID, so multiple rows sharing a CID (repeated same-content
    // writes) are ONE version. Collapse them, keeping the newest occurrence.
    const seenCids = new Set<string>()
    let isNewestOfKey = true

    while (i < rows.length && rows[i].key === key) {
      const row = rows[i]
      i++
      if (seenCids.has(row.cid)) continue
      seenCids.add(row.cid)
      versions.push({
        key: row.key,
        versionId: row.cid,
        isLatest: isNewestOfKey && !isDeleted,
        lastModified: row.lastModified,
        etag: objectETag(row.md5, row.cid),
        size: row.size,
      })
      isNewestOfKey = false
    }

    if (isDeleted) {
      const markerTime = pointerDeletedAt ?? newestVersionTime
      deleteMarkers.push({
        key,
        versionId: deleteMarkerVersionId(markerTime),
        isLatest: true,
        lastModified: markerTime,
      })
    }

    keysEmitted++
    lastKey = key
  }

  // keysEmitted === 0 means nothing was scanned (e.g. maxKeys <= 0, a valid S3
  // existence probe). There is no prior key to resume from, so nextKeyMarker is null.
  return {
    versions,
    deleteMarkers,
    isTruncated,
    nextKeyMarker: isTruncated && keysEmitted > 0 ? lastKey : null,
  }
}

/**
 * Turn the rows fetched from storage into a complete ListObjectVersions result.
 *
 * `fetchedRows` must be sorted by key ascending, then newest version first per key,
 * and fetched with the limit returned by {@link computeListObjectVersionsDbLimit}.
 * `dbLimit` is that same limit — needed to detect the case where storage returned
 * a full batch of distinct keys so truncation is guaranteed even if buildListVersionsResult
 * stopped before inspecting beyond.
 */
export const finalizeListObjectVersions = (
  params: ListObjectVersionsParams,
  fetchedRows: S3VersionRow[],
  dbLimit: number,
): ListObjectVersionsResult => {
  const { bucket, prefix, keyMarker, maxKeys } = params
  const listResult = buildListVersionsResult(fetchedRows, maxKeys)
  let { isTruncated, nextKeyMarker } = listResult

  // Count distinct keys in fetchedRows to verify if storage returned a full batch.
  // One extra empty page is harmless, but silently dropping data is not.
  const distinctKeys = new Set(fetchedRows.map((r) => r.key))
  if (!isTruncated && distinctKeys.size >= dbLimit && fetchedRows.length > 0) {
    isTruncated = true
    nextKeyMarker = fetchedRows[fetchedRows.length - 1].key
  }

  return {
    name: bucket,
    prefix,
    maxKeys,
    keyMarker,
    isTruncated,
    nextKeyMarker: isTruncated ? nextKeyMarker : null,
    versions: listResult.versions,
    deleteMarkers: listResult.deleteMarkers,
  }
}
