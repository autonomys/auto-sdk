/**
 * Synthesise a delete marker's versionId.
 *
 * NOTE: dm-<epoch> is a synthetic, display-only versionId for ListObjectVersions
 * and DeleteObject responses. Delete markers are not stored as standalone content
 * rows, so deleteObjectVersionHandler unconditionally returns 403 / MethodNotAllowed,
 * and findVersionByCid can never resolve or download them.
 *
 * @param deletedAt - The deletion timestamp.
 * @returns Formatted delete marker versionId string: `dm-`.
 */
export const deleteMarkerVersionId = (deletedAt: Date): string =>
  `dm-${deletedAt.getTime()}`

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
