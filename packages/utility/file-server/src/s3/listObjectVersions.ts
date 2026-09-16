import { formatETag } from './etag.js'

// ── ListObjectVersions ─────────────────────────────────────────────────────

/** A single version entry returned by ListObjectVersions. */
export interface S3VersionEntry {
  key: string
  /** versionId = the content CID. */
  versionId: string
  isLatest: boolean
  lastModified: Date
  /** Quoted ETag: the MD5 when known, else the CID (matching GET/HEAD/List). */
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
  versions: S3VersionEntry[]
  deleteMarkers: S3DeleteMarkerEntry[]
  isTruncated: boolean
  nextKeyMarker: string | null
}

/** Raw database/storage row representation before version aggregation. */
export interface S3VersionRow {
  key: string
  cid: string
  pointerDeletedAt?: Date | null
  ownerRemoved?: boolean
  lastModified: Date
  md5?: string | null
  size: bigint
}

/**
 * Synthesise a delete marker's versionId. Markers are not stored — they are
 * derived from the mapping's deleted_at — so their id is derived too, from the
 * delete time. The same value is reported by ListObjectVersions and on the
 * DeleteObject response for a given delete.
 *
 * @param deletedAt - The deletion timestamp.
 * @returns Formatted delete marker versionId string: `dm-${deletedAt.getTime()}`.
 */
export const deleteMarkerVersionId = (deletedAt: Date): string => `dm-${deletedAt.getTime()}`

/**
 * DeleteObject result: whether this call created a delete marker (soft-deleted
 * an active key) and, if so, the marker's synthesised versionId. Surfaced as
 * the x-amz-delete-marker / x-amz-version-id response headers so a
 * versioning-aware client can tell a marker was written rather than data
 * destroyed.
 */
export interface DeleteObjectResult {
  deleteMarker: boolean
  versionId: string | null
}

/**
 * Resolves the DeleteObject response metadata based on deletion timestamp.
 *
 * @param deletedAt - The deletion timestamp, or null/undefined if not deleted.
 * @returns DeleteObjectResult with deleteMarker boolean and versionId.
 */
export const resolveDeleteMarkerResult = (
  deletedAt: Date | null | undefined,
): DeleteObjectResult =>
  deletedAt
    ? {
        deleteMarker: true,
        versionId: deleteMarkerVersionId(deletedAt),
      }
    : { deleteMarker: false, versionId: null }

/**
 * Apply version deduplication, soft-delete detection, and maxKeys pagination to
 * sorted storage rows.
 *
 * Rows must arrive ordered by key ascending, then newest version first per key.
 *
 * - IsLatest marks the current content version of each live key.
 * - For a key that is soft-deleted OR owner-removed, a delete marker is
 *   synthesised as the latest entry instead (derived from deleteMarkerVersionId).
 * - Repeated same-content writes sharing the same CID under a single key are
 *   collapsed to one version, keeping the newest occurrence.
 * - Whole keys are kept together: pagination bounds distinct keys, emitting
 *   `nextKeyMarker` when more keys remain beyond `maxKeys`.
 *
 * @param rows - Sorted version rows from storage.
 * @param maxKeys - Maximum number of distinct keys to return in this page.
 * @returns Formatted ListObjectVersionsResult.
 */
export const buildListVersionsResult = (
  rows: S3VersionRow[],
  maxKeys: number,
): ListObjectVersionsResult => {
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
        etag: row.md5 ? formatETag(row.md5) : formatETag(row.cid),
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

  return {
    versions,
    deleteMarkers,
    isTruncated,
    nextKeyMarker: isTruncated ? lastKey : null,
  }
}
