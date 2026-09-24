import { createHash } from 'crypto'

// Compute the hex MD5 digest of a buffer.
export const md5Hex = (data: Buffer): string => createHash('md5').update(data).digest('hex')

// Format a raw hex MD5 or CID string as a quoted S3 ETag: `"<value>"`.
export const formatETag = (value: string): string => `"${value}"`

/**
 * Format an ETag from either the object's MD5 hash (when present) or fallback CID.
 * Ensures standard quoted formatting: `"<etag>"`.
 */
export const objectETag = (md5: string | null | undefined, cid: string): string =>
  formatETag(md5 || cid)

/**
 * Compute the S3 composite ETag for a multipart upload.
 *
 * AWS format: MD5 of the binary concatenation of each part's raw MD5 bytes,
 * followed by a hyphen and the part count. e.g. `"abc123...-3"`.
 *
 * Part ETags are expected in quoted hex format: `"d41d8cd98f00b204e9800998ecf8427e"`.
 */
export const multipartETag = (partETags: string[]): string => {
  const partMd5Buffers = partETags.map((tag) => Buffer.from(tag.replace(/"/g, ''), 'hex'))
  const composite = md5Hex(Buffer.concat(partMd5Buffers))
  return `"${composite}-${partETags.length}"`
}
