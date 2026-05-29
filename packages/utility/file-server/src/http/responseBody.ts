import { PassThrough, Transform } from 'stream'
import { createInflate } from 'zlib'
import { DownloadHeaderResult } from './headers.js'

/**
 * Returns the stream transform that must be applied to a `FileResponse` body
 * before it is written to the HTTP response, based on the result of
 * {@link handleDownloadResponseHeaders}.
 *
 * This exists to make the `shouldDecompressBody` contract impossible to forget:
 * when `shouldDecompressBody` is true the caller MUST decompress the (deflate)
 * body server-side, otherwise it ships raw compressed bytes labeled with a
 * decompressed Content-Type and no Content-Encoding, corrupting the response.
 *
 * Usage:
 *
 * ```ts
 * const result = handleDownloadResponseHeaders(req, res, metadata, options)
 * pipeline(file.data, createResponseBodyTransform(result), res, (err) => { ... })
 * ```
 *
 * - When `shouldDecompressBody` is true, returns a `zlib` inflate transform.
 * - Otherwise returns a pass-through transform (no-op), so callers can always
 *   pipe through the returned stream unconditionally.
 */
export const createResponseBodyTransform = ({
  shouldDecompressBody,
}: DownloadHeaderResult): Transform => (shouldDecompressBody ? createInflate() : new PassThrough())
