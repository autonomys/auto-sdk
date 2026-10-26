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
  versionIdMarker?: string | null
  maxKeys: number
}

/** The complete result of ListObjectVersions. */
export interface ListObjectVersionsResult {
  name: string
  prefix: string
  maxKeys: number
  keyMarker: string | null
  versionIdMarker?: string | null
  isTruncated: boolean
  nextKeyMarker: string | null
  nextVersionIdMarker: string | null
  versions: S3VersionEntry[]
  deleteMarkers: S3DeleteMarkerEntry[]
}

/** Raw database/storage row representation before version aggregation. */
export interface S3VersionRow {
  /**
   * Monotonic row identifier from storage (e.g. object_versions.id), used as the
   * cursor for entry-level pagination across page boundaries.
   */
  id: string
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

/** Options for buildListVersionsResult. */
export interface BuildListVersionsOptions {
  keyMarker?: string | null
  versionIdMarker?: string | null
}

/**
 * How many version rows to fetch from storage for a given ListObjectVersions page.
 *
 * Each row produces at least one Version entry (or two if a fresh deleted key
 * also synthesises a DeleteMarker), so maxKeys + 1 rows are sufficient to detect
 * truncation.
 */
export const computeListObjectVersionsDbLimit = (maxKeys: number): number => maxKeys + 1

/**
 * Apply soft-delete detection and entry-bounded maxKeys pagination to sorted storage rows.
 *
 * Storage contract (#790):
 * - Storage must deduplicate repeated same-content writes sharing the same CID under a key
 *   (e.g. via `DISTINCT ON (key, cid)` keeping the newest row per `(key, cid)`).
 * - Rows must arrive sorted by `key ASC`, then newest first per key (`id DESC`).
 * - Storage pagination resumes by `(key, id)` via `key > keyMarker OR (key = keyMarker AND id < versionIdMarker)`.
 *
 * In accordance with S3 specification (#790):
 * - maxKeys bounds the total number of Version + DeleteMarker entries per page.
 * - For a key that is soft-deleted OR owner-removed, a delete marker is synthesised as
 *   the latest entry (derived from deleteMarkerVersionId).
 * - A synthesised delete marker is emitted ONLY when starting a key fresh, NOT when
 *   resuming mid-key (where the marker was already emitted on an earlier page).
 * - When a page fills immediately upon emitting a delete marker, `nextVersionIdMarker`
 *   is set to `(BigInt(firstRowId) + 1n).toString()` so storage resumes at the key's
 *   newest content version row inclusive, preventing any lost versions.
 * - When truncated, `nextKeyMarker` and `nextVersionIdMarker` are returned so
 *   subsequent pages can resume seamlessly without skipping or duplicating versions.
 *
 * @param rows - Sorted version rows from storage.
 * @param maxKeys - Maximum number of Version + DeleteMarker entries to return in this page.
 * @param options - Pagination markers (keyMarker, versionIdMarker).
 * @returns Filtered versions, deleteMarkers, isTruncated, nextKeyMarker, and nextVersionIdMarker.
 */
export const buildListVersionsResult = (
  rows: S3VersionRow[],
  maxKeys: number,
  options?: BuildListVersionsOptions,
): Pick<
  ListObjectVersionsResult,
  'versions' | 'deleteMarkers' | 'isTruncated' | 'nextKeyMarker' | 'nextVersionIdMarker'
> => {
  const keyMarker = options?.keyMarker ?? null
  const versionIdMarker = options?.versionIdMarker ?? null

  if (maxKeys <= 0) {
    return {
      versions: [],
      deleteMarkers: [],
      isTruncated: rows.length > 0,
      nextKeyMarker: null,
      nextVersionIdMarker: null,
    }
  }

  const versions: S3VersionEntry[] = []
  const deleteMarkers: S3DeleteMarkerEntry[] = []
  let entriesEmitted = 0
  let lastKey: string | null = null
  let lastVersionIdMarker: string | null = null

  let i = 0
  while (i < rows.length) {
    if (entriesEmitted >= maxKeys) {
      break
    }

    const key = rows[i].key
    const resumingMidKey = keyMarker !== null && key === keyMarker && versionIdMarker !== null

    const pointerDeletedAt = rows[i].pointerDeletedAt
    const isDeleted = pointerDeletedAt != null || Boolean(rows[i].ownerRemoved)
    const newestVersionTime = rows[i].lastModified
    const firstRowId = rows[i].id

    // Emit the synthesised delete marker only when starting a key fresh (not when resuming mid-key).
    if (isDeleted && !resumingMidKey) {
      const markerTime = pointerDeletedAt ?? newestVersionTime
      const markerVersionId = deleteMarkerVersionId(markerTime)
      deleteMarkers.push({
        key,
        versionId: markerVersionId,
        isLatest: true,
        lastModified: markerTime,
      })
      entriesEmitted++
      lastKey = key
      // If maxKeys is reached right after emitting the delete marker, set the cursor to
      // firstRowId + 1n so storage's `id < idm` filter resumes at firstRowId inclusive,
      // while resumingMidKey suppresses duplicate delete marker emission.
      lastVersionIdMarker = (BigInt(firstRowId) + 1n).toString()
      if (entriesEmitted >= maxKeys) {
        break
      }
    }

    let isNewestOfKey = !resumingMidKey

    while (i < rows.length && rows[i].key === key) {
      if (entriesEmitted >= maxKeys) {
        break
      }
      const row = rows[i]
      i++
      versions.push({
        key: row.key,
        versionId: row.cid,
        isLatest: isNewestOfKey && !isDeleted,
        lastModified: row.lastModified,
        etag: objectETag(row.md5, row.cid),
        size: row.size,
      })
      isNewestOfKey = false
      entriesEmitted++
      lastKey = row.key
      lastVersionIdMarker = row.id
    }
  }

  const isTruncated = i < rows.length

  return {
    versions,
    deleteMarkers,
    isTruncated,
    nextKeyMarker: isTruncated ? lastKey : null,
    nextVersionIdMarker: isTruncated ? lastVersionIdMarker : null,
  }
}

/**
 * Turn the rows fetched from storage into a complete ListObjectVersions result.
 *
 * `fetchedRows` must be sorted by key ascending, then newest version first per key,
 * and fetched with the limit returned by {@link computeListObjectVersionsDbLimit}.
 * `dbLimit` is that same limit — needed to detect the case where storage returned
 * a full batch so truncation is guaranteed even if buildListVersionsResult stopped earlier.
 */
export const finalizeListObjectVersions = (
  params: ListObjectVersionsParams,
  fetchedRows: S3VersionRow[],
  dbLimit: number,
): ListObjectVersionsResult => {
  const { bucket, prefix, keyMarker, versionIdMarker, maxKeys } = params
  const listResult = buildListVersionsResult(fetchedRows, maxKeys, {
    keyMarker,
    versionIdMarker,
  })
  let { isTruncated, nextKeyMarker, nextVersionIdMarker } = listResult

  const totalEmitted = listResult.versions.length + listResult.deleteMarkers.length
  if (!isTruncated && fetchedRows.length >= dbLimit && totalEmitted > 0) {
    isTruncated = true
    const lastRow = fetchedRows[fetchedRows.length - 1]
    nextKeyMarker = lastRow.key
    nextVersionIdMarker = lastRow.id
  }

  return {
    name: bucket,
    prefix,
    maxKeys,
    keyMarker,
    versionIdMarker: versionIdMarker ?? null,
    isTruncated,
    nextKeyMarker: isTruncated ? nextKeyMarker : null,
    nextVersionIdMarker: isTruncated ? nextVersionIdMarker : null,
    versions: listResult.versions,
    deleteMarkers: listResult.deleteMarkers,
  }
}
