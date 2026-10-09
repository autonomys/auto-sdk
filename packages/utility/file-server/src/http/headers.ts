import { CompressionAlgorithm, EncryptionAlgorithm } from '@autonomys/auto-dag-data'
import { Request, Response } from 'express'
import { ByteRange, DownloadMetadata, DownloadOptions } from '../models.js'
import { inferMimeType } from '../utils.js'

// Generic mimetypes that should trigger extension-based fallback
const GENERIC_MIME_TYPES = new Set(['application/octet-stream', 'binary/octet-stream'])

// Get the best mimetype for a file, falling back to extension-based inference
// when the stored mimetype is missing or generic
const getMimeType = (metadata: DownloadMetadata): string => {
  const storedMime = metadata.mimeType?.toLowerCase()

  // If we have a meaningful mimetype, use it
  if (storedMime && !GENERIC_MIME_TYPES.has(storedMime)) {
    return metadata.mimeType!
  }

  // Otherwise, infer from filename extension
  return inferMimeType(metadata.name)
}

// Helper to create an ASCII-safe fallback for filename parameter (RFC 2183/6266)
const toAsciiFallback = (name: string) =>
  name
    .replace(/[^\x20-\x7E]+/g, '_') // replace non-ASCII with underscore
    .replace(/["\\]/g, '\\$&') // escape quotes and backslashes

// RFC 5987 encoding for filename* parameter
const rfc5987Encode = (str: string) =>
  encodeURIComponent(str)
    .replace(/['()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/\*/g, '%2A')

// Check if this is actually a document navigation (based on headers only)
// Used to determine if browser will auto-decompress Content-Encoding
const isDocumentNavigation = (req: Request) => {
  const destHeader = req.headers['sec-fetch-dest']
  const dest = (Array.isArray(destHeader) ? destHeader[0] : (destHeader ?? '')).toLowerCase()
  if (dest && dest !== 'document') return false // e.g. <img>, <video>, fetch(), etc.

  const modeHeader = req.headers['sec-fetch-mode']
  const mode = (Array.isArray(modeHeader) ? modeHeader[0] : (modeHeader ?? '')).toLowerCase()
  if (mode && mode !== 'navigate') return false // programmatic fetch / subresource

  return true
}

// Decide if this file type is something browsers can usually render inline via URL
const isPreviewableInline = (metadata: DownloadMetadata) => {
  if (metadata.isEncrypted) return false

  const mimeType = getMimeType(metadata).toLowerCase()
  const directDisplayTypes = ['image/', 'video/', 'audio/']

  return (
    directDisplayTypes.some((type) => mimeType.startsWith(type)) || mimeType === 'application/pdf'
  )
}

const isInlineDisposition = (req: Request, metadata: DownloadMetadata) => {
  // Explicit query overrides - treat presence as boolean flag
  // ?download or ?download=true triggers attachment, ?download=false is ignored
  if (req.query.download === 'true' || req.query.download === '') return false
  // ?inline or ?inline=true triggers inline, ?inline=false is ignored
  if (req.query.inline === 'true' || req.query.inline === '') return true

  // Folders (served as zip) should default to attachment
  if (metadata.type !== 'file') return false

  // For media / PDFs that browsers can render directly, prefer inline even for subresources
  if (isPreviewableInline(metadata)) return true

  // Fallback to header-based detection: top-level document navigations are inline
  return isDocumentNavigation(req)
}

const buildDisposition = (req: Request, metadata: DownloadMetadata, filename: string) => {
  const fallbackName = toAsciiFallback(filename || 'download')
  const encoded = rfc5987Encode(filename || 'download')
  const type = isInlineDisposition(req, metadata) ? 'inline' : 'attachment'
  return `${type}; filename="${fallbackName}"; filename*=UTF-8''${encoded}`
}

export type DownloadHeaderResult = {
  /**
   * When true, the caller MUST decompress the response body server-side before
   * writing it to the wire (e.g. by piping through `zlib.createInflate()`).
   *
   * In this case no `Content-Encoding` header is set, so clients will NOT
   * auto-decompress. Shipping the raw (deflate) `FileResponse` body without
   * inflating it sends compressed bytes labeled with a decompressed
   * `Content-Type`, corrupting the response (broken images, failed
   * `JSON.parse`, content-decoding errors).
   *
   * Prefer {@link createResponseBodyTransform} so this can't be forgotten.
   */
  shouldDecompressBody: boolean
  /**
   * When true, `byteRange` starts at or beyond the end of the file, so the status
   * has been set to 416 with a Content-Range that reports the file size. The
   * caller MUST end the response without a body (`res.end()`) instead of
   * streaming the file.
   *
   * Callers can avoid fetching the body at all by checking
   * {@link resolveByteRange} first.
   */
  rangeNotSatisfiable: boolean
}

/**
 * The outcome of resolving a Range header against a representation of known size.
 *
 * - `none`: serve the full representation with 200. Either there is no Range
 *   header, or it is one this server ignores (see {@link resolveByteRange}).
 * - `unsatisfiable`: answer 416, e.g. with {@link sendRangeNotSatisfiable}.
 * - `partial`: serve the inclusive `byteRange` with 206. Both ends lie within
 *   the representation.
 */
export type ResolvedByteRange =
  { kind: 'none' } | { kind: 'unsatisfiable' } | { kind: 'partial'; byteRange: [number, number] }

type RangeSpec =
  { kind: 'offset'; start: number; end?: number } | { kind: 'suffix'; length: number }

// A single space is accepted as well as '=' because the parser this replaces
// sliced off the first six characters, so `bytes 0-9` has always worked.
const BYTES_UNIT = /^bytes[= ]/i
const BYTE_RANGE_SPEC = /^(\d*)-(\d*)$/

// Anything other than one well-formed byte range is ignored rather than rejected
// with 416, which RFC 9110 section 14.2 allows: the client gets the full
// representation with 200. That covers malformed values, other range units,
// inverted ranges and multi-range requests (this server never sends
// multipart/byteranges).
const parseRangeHeader = (header: unknown): RangeSpec | undefined => {
  if (typeof header !== 'string') return undefined

  const value = header.trim()
  if (!BYTES_UNIT.test(value)) return undefined

  // range-set is a list, so whitespace around elements and empty elements are allowed
  const specs = value
    .slice('bytes='.length)
    .split(',')
    .map((spec) => spec.trim())
    .filter((spec) => spec !== '')
  if (specs.length !== 1) return undefined

  const match = BYTE_RANGE_SPEC.exec(specs[0])
  if (!match) return undefined
  const [, rawStart, rawEnd] = match

  if (rawStart === '') {
    if (rawEnd === '') return undefined
    return { kind: 'suffix', length: Number(rawEnd) }
  }

  const start = Number(rawStart)
  if (rawEnd === '') return { kind: 'offset', start }

  const end = Number(rawEnd)
  if (end < start) return undefined
  return { kind: 'offset', start, end }
}

const resolveRangeSpec = (spec: RangeSpec | undefined, size: number): ResolvedByteRange => {
  if (!spec) return { kind: 'none' }

  const lastByte = size - 1
  if (spec.kind === 'suffix') {
    if (spec.length === 0) return { kind: 'unsatisfiable' }
    // RFC 9110 counts a non-zero suffix of an empty representation as satisfiable,
    // but no Content-Range can describe zero bytes, so serve it whole instead.
    if (size === 0) return { kind: 'none' }
    return { kind: 'partial', byteRange: [Math.max(0, size - spec.length), lastByte] }
  }

  if (spec.start >= size) return { kind: 'unsatisfiable' }
  return { kind: 'partial', byteRange: [spec.start, Math.min(spec.end ?? lastByte, lastByte)] }
}

const isByteOffset = (n: number) => Number.isSafeInteger(n) && n >= 0

// The start is checked before the end because callers may clamp the end to the
// last byte first, which inverts a range that starts past the end of the file:
// that is still a 416, not an invalid range to ignore.
const resolveByteRangeTuple = ([start, end]: ByteRange, size: number): ResolvedByteRange => {
  if (!isByteOffset(start)) return { kind: 'none' }
  if (start >= size) return { kind: 'unsatisfiable' }
  if (end != null && (!isByteOffset(end) || end < start)) return { kind: 'none' }
  return resolveRangeSpec({ kind: 'offset', start, end: end ?? undefined }, size)
}

/**
 * Resolve the request's Range header (RFC 9110 section 14) against a
 * representation of `size` bytes.
 *
 * Supports a single `bytes=start-`, `bytes=start-end` or `bytes=-suffixLength`
 * range. An end past the last byte is clamped to it, and a suffix longer than the
 * representation selects all of it. Malformed, inverted and multi-range headers
 * are ignored, so they resolve to `none` (serve 200), as does any range when the
 * size is unknown.
 *
 * Resolve before fetching the body: pass `byteRange` both to the data source and
 * to {@link handleDownloadResponseHeaders}, and answer `unsatisfiable` with
 * {@link sendRangeNotSatisfiable}.
 */
export const resolveByteRange = (
  req: Request,
  size: bigint | number | undefined,
): ResolvedByteRange => {
  if (size == null) return { kind: 'none' }
  return resolveRangeSpec(parseRangeHeader(req.headers['range']), Number(size))
}

const setRangeNotSatisfiable = (res: Response, size: bigint | number) => {
  res.status(416)
  res.set('Content-Range', `bytes */${size}`)
}

/**
 * Answer 416 Range Not Satisfiable, with the Content-Range that reports the
 * representation's current length (RFC 9110 section 15.5.17).
 */
export const sendRangeNotSatisfiable = (res: Response, size: bigint | number) => {
  setRangeNotSatisfiable(res, size)
  res.end()
}

/**
 * `byteRange` is inclusive and must be the range the body was fetched with. An
 * end past the last byte is clamped, a start at or past it answers 416 (see
 * {@link DownloadHeaderResult.rangeNotSatisfiable}), and an invalid range
 * (negative, inverted or not an integer) is ignored and the full file is
 * described instead.
 */
export const handleDownloadResponseHeaders = (
  req: Request,
  res: Response,
  metadata: DownloadMetadata,
  { byteRange = undefined, rawMode = false }: DownloadOptions,
): DownloadHeaderResult => {
  const baseName = metadata.name || 'download'
  const fileName = metadata.type === 'file' ? baseName : `${baseName}.zip`
  let shouldDecompressBody = false
  let rangeNotSatisfiable = false

  if (metadata.type === 'file') {
    const contentType =
      !metadata.isEncrypted && !rawMode ? getMimeType(metadata) : 'application/octet-stream'
    res.set('Content-Type', contentType)

    const compressedButNotEncrypted = metadata.isCompressed && !metadata.isEncrypted

    // Only set Content-Encoding for document navigations where browsers auto-decompress
    // Don't set it for <img>, <video>, fetch(), etc. as browsers won't auto-decompress those
    const shouldHandleEncoding = req.query.ignoreEncoding
      ? req.query.ignoreEncoding !== 'true'
      : isDocumentNavigation(req)

    const mimeType = contentType.toLowerCase()
    const isMediaType = mimeType.startsWith('video/') || mimeType.startsWith('audio/')

    // Determine compression handling: either browser decompresses via Content-Encoding,
    // or we decompress server-side
    const canUseBrowserDecompression =
      compressedButNotEncrypted && shouldHandleEncoding && !rawMode && !byteRange && !isMediaType

    // When true, the compressed (deflate) bytes are streamed verbatim on the wire
    // and the browser is expected to auto-decompress via Content-Encoding.
    let bodyIsCompressedOnWire = false
    if (canUseBrowserDecompression) {
      res.set('Content-Encoding', 'deflate')
      bodyIsCompressedOnWire = true
    } else if (compressedButNotEncrypted) {
      shouldDecompressBody = true
    }

    // Set Accept-Ranges once based on the final body decision.
    // Can't advertise ranges when decompressing server-side (can't seek in stream),
    // when the on-the-wire body is compressed (offsets map to compressed bytes, not
    // the decompressed size we'd advertise), or when the size is unknown.
    const canAdvertiseRanges =
      !shouldDecompressBody && !bodyIsCompressedOnWire && metadata.size != null
    res.set('Accept-Ranges', canAdvertiseRanges ? 'bytes' : 'none')

    const range: ResolvedByteRange =
      byteRange && metadata.size != null
        ? resolveByteRangeTuple(byteRange, Number(metadata.size))
        : { kind: 'none' }

    if (shouldDecompressBody || bodyIsCompressedOnWire) {
      // bodyIsCompressedOnWire: the compressed bytes are sent verbatim with
      //   Content-Encoding: deflate, and the compressed length is not known here, so
      //   advertising metadata.size (the decompressed size) would mismatch the wire body.
      // shouldDecompressBody: we inflate server-side and stream the result; rather than
      //   trusting metadata.size to exactly match the inflated byte count, we stream it.
      // In both cases, omit Content-Length and rely on chunked transfer encoding so the
      // advertised length can never disagree with the bytes actually placed on the wire.
    } else if (range.kind === 'unsatisfiable') {
      // No Content-Length here, so a caller that still streams its (normally
      // empty) body cannot contradict one.
      setRangeNotSatisfiable(res, metadata.size!)
      rangeNotSatisfiable = true
    } else if (range.kind === 'partial') {
      const [start, end] = range.byteRange
      res.status(206)
      res.set('Content-Range', `bytes ${start}-${end}/${metadata.size}`)
      res.set('Content-Length', (end - start + 1).toString())
    } else if (metadata.size != null) {
      res.set('Content-Length', metadata.size.toString())
    }
  } else {
    const contentType = metadata.isEncrypted ? 'application/octet-stream' : 'application/zip'
    res.set('Content-Type', contentType)
  }

  res.set('Content-Disposition', buildDisposition(req, metadata, fileName))

  return { shouldDecompressBody, rangeNotSatisfiable }
}

export const handleS3DownloadResponseHeaders = (
  req: Request,
  res: Response,
  metadata: DownloadMetadata,
) => {
  if (metadata.isEncrypted) {
    res.set('x-amz-meta-encryption', EncryptionAlgorithm.AES_256_GCM)
  }

  if (metadata.isCompressed) {
    res.set('x-amz-meta-compression', CompressionAlgorithm.ZLIB)
  }
}

/**
 * Parse the request's Range header without knowing the representation size.
 *
 * A suffix range (`bytes=-N`) cannot be expressed without the size, so it is
 * ignored here, along with malformed, inverted and multi-range headers. The
 * returned end is not clamped and the start may lie past the end of the file:
 * {@link handleDownloadResponseHeaders} handles both, but the body must be
 * fetched with the same range.
 *
 * @deprecated Use {@link resolveByteRange}, which serves suffix ranges, clamps
 * the end and reports unsatisfiable ranges before the body is fetched.
 */
export const getByteRange = (req: Request): ByteRange | undefined => {
  const spec = parseRangeHeader(req.headers['range'])
  return spec?.kind === 'offset' ? [spec.start, spec.end] : undefined
}
