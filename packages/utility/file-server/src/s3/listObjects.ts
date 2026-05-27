// Pure ListObjectsV2 logic: delimiter folding, maxKeys pagination, and
// continuation-token placement. The only piece left to the caller is the
// actual storage query that produces the sorted rows fed into finalizeListObjects.

/** A single object entry returned by ListObjectsV2. */
export interface S3ObjectListing {
  key: string
  cid: string
  /** Object size in bytes; 0 when not yet indexed. */
  size: bigint
  lastModified: Date
}

export interface ListObjectsParams {
  bucket: string
  /** Key prefix to filter results (default: empty string = all keys). */
  prefix: string
  /** If set, fold keys at this character into CommonPrefixes (rclone uses '/'). */
  delimiter: string | null
  /** Maximum number of logical entries (objects + common prefixes) to return. */
  maxKeys: number
  /** Opaque token returned by a previous truncated response. */
  continuationToken: string | null
}

export interface ListObjectsResult {
  name: string
  prefix: string
  maxKeys: number
  isTruncated: boolean
  nextContinuationToken: string | null
  objects: S3ObjectListing[]
  commonPrefixes: string[]
}

/**
 * How many raw rows to fetch from storage for a given page request.
 *
 * Without a delimiter every row is a distinct logical entry, so we only need
 * maxKeys + 1 rows (the extra row lets buildListResult detect truncation
 * without fetching the entire table). With a delimiter, multiple rows can fold
 * into a single CommonPrefix, so we over-fetch by a factor of 10 to handle
 * large prefix groups while still keeping memory use bounded.
 */
export const computeListObjectsDbLimit = (maxKeys: number, delimiter: string | null): number =>
  delimiter ? Math.min(maxKeys * 10 + 100, 10_000) : maxKeys + 1

/**
 * Apply delimiter folding and maxKeys pagination to a sorted list of all
 * matching objects.
 *
 * Keys that contain `delimiter` after the prefix are folded into
 * CommonPrefixes entries. Pagination tracks the last raw key scanned so that
 * the continuation token restores the exact position on the next call.
 *
 * When maxKeys entries are accumulated and the next entry would be a new
 * CommonPrefix, we stop before adding it. The continuation token is set to the
 * last key already scanned, which falls before the new prefix group, so the
 * next page re-processes that group from the beginning.
 */
export const buildListResult = (
  sortedObjects: S3ObjectListing[],
  prefix: string,
  delimiter: string | null,
  maxKeys: number,
): Pick<
  ListObjectsResult,
  'objects' | 'commonPrefixes' | 'isTruncated' | 'nextContinuationToken'
> => {
  const objects: S3ObjectListing[] = []
  const commonPrefixSet = new Set<string>()
  let scanIdx = 0

  while (scanIdx < sortedObjects.length) {
    const { key } = sortedObjects[scanIdx]

    // Check whether this key folds into a common prefix.
    let foldedPrefix: string | null = null
    if (delimiter) {
      const afterPrefix = key.slice(prefix.length)
      const delimIdx = afterPrefix.indexOf(delimiter)
      if (delimIdx >= 0) {
        foldedPrefix = prefix + afterPrefix.slice(0, delimIdx + delimiter.length)
      }
    }

    if (foldedPrefix !== null) {
      if (!commonPrefixSet.has(foldedPrefix)) {
        // Adding a new common prefix — check if we're already full.
        if (objects.length + commonPrefixSet.size >= maxKeys) {
          // Stop here; the continuation token will fall before this prefix
          // group so the next page re-processes it from the start.
          break
        }
        commonPrefixSet.add(foldedPrefix)
      }
      scanIdx++
      continue
    }

    // Regular object — check capacity before adding.
    if (objects.length + commonPrefixSet.size >= maxKeys) {
      break
    }
    objects.push(sortedObjects[scanIdx])
    scanIdx++
  }

  const isTruncated = scanIdx < sortedObjects.length
  // scanIdx === 0 means nothing was scanned (e.g. maxKeys <= 0, a valid S3
  // existence probe). There is no prior key to resume from, so omit the token
  // rather than indexing sortedObjects[-1].
  const nextContinuationToken = isTruncated && scanIdx > 0 ? sortedObjects[scanIdx - 1].key : null

  return {
    objects,
    commonPrefixes: [...commonPrefixSet].sort(),
    isTruncated,
    nextContinuationToken,
  }
}

/**
 * Turn the rows fetched from storage into a complete ListObjectsV2 result.
 *
 * `fetchedRows` must be sorted by key ascending and fetched with the limit
 * returned by {@link computeListObjectsDbLimit}. `dbLimit` is that same limit —
 * it's needed to detect the case where storage returned a full batch and rows
 * beyond the limit were never seen by {@link buildListResult}.
 */
export const finalizeListObjects = (
  params: ListObjectsParams,
  fetchedRows: S3ObjectListing[],
  dbLimit: number,
): ListObjectsResult => {
  const { bucket, prefix, delimiter, maxKeys } = params

  const listResult = buildListResult(fetchedRows, prefix, delimiter, maxKeys)
  const { objects, commonPrefixes } = listResult
  let { isTruncated, nextContinuationToken } = listResult

  // If storage returned a full batch (fetchedRows.length === dbLimit) there may
  // be rows beyond the LIMIT that buildListResult never saw. This happens when
  // every fetched row folds into CommonPrefixes and none break the maxKeys cap —
  // buildListResult then sees scanIdx === sortedObjects.length and concludes
  // isTruncated = false. Override to be conservative: one extra empty page is
  // harmless, but silently dropping data is not.
  if (!isTruncated && fetchedRows.length === dbLimit) {
    isTruncated = true
    const lastKey = fetchedRows[fetchedRows.length - 1].key

    // If the last scanned key folded into a CommonPrefix, the naive choice
    // `lastKey` would land *inside* a virtual directory we've already
    // represented in commonPrefixes. The next page's `key > token` query would
    // then return the remaining keys in that directory, which would re-fold
    // into — and re-emit — the same CommonPrefix entry.
    //
    // Advance the token past every key that could possibly fold into that
    // prefix by appending a high-sort sentinel. `￿` (encoded as
    // 0xEF 0xBF 0xBF in UTF-8) sorts after every realistic S3 key character,
    // so `key > token` skips the rest of the directory and resumes at the
    // first key that falls outside it.
    if (delimiter) {
      const afterPrefix = lastKey.slice(prefix.length)
      const delimIdx = afterPrefix.indexOf(delimiter)
      if (delimIdx >= 0) {
        const lastFoldedPrefix = prefix + afterPrefix.slice(0, delimIdx + delimiter.length)
        nextContinuationToken = lastFoldedPrefix + '￿'
      } else {
        nextContinuationToken = lastKey
      }
    } else {
      nextContinuationToken = lastKey
    }
  }

  return {
    name: bucket,
    prefix,
    maxKeys,
    isTruncated,
    nextContinuationToken,
    objects,
    commonPrefixes,
  }
}
