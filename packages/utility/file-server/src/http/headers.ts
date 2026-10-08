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
}

export const handleDownloadResponseHeaders = (
  req: Request,
  res: Response,
  metadata: DownloadMetadata,
  { byteRange = undefined, rawMode = false }: DownloadOptions,
): DownloadHeaderResult => {
  const baseName = metadata.name || 'download'
  const fileName = metadata.type === 'file' ? baseName : `${baseName}.zip`
  let shouldDecompressBody = false

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

    if (shouldDecompressBody || bodyIsCompressedOnWire) {
      // bodyIsCompressedOnWire: the compressed bytes are sent verbatim with
      //   Content-Encoding: deflate, and the compressed length is not known here, so
      //   advertising metadata.size (the decompressed size) would mismatch the wire body.
      // shouldDecompressBody: we inflate server-side and stream the result; rather than
      //   trusting metadata.size to exactly match the inflated byte count, we stream it.
      // In both cases, omit Content-Length and rely on chunked transfer encoding so the
      // advertised length can never disagree with the bytes actually placed on the wire.
    } else if (byteRange && metadata.size != null) {
      const fileSize = Number(metadata.size)
      if (byteRange[0] >= fileSize || (byteRange[1] !== undefined && byteRange[0] > byteRange[1])) {
        res.status(416)
        res.set('Content-Range', `bytes */${metadata.size}`)
        return { shouldDecompressBody: false }
      }

      // For range requests on non-compressed content
      res.status(206)
      const upperBound = Math.min(byteRange[1] ?? fileSize - 1, fileSize - 1)
      res.set('Content-Range', `bytes ${byteRange[0]}-${upperBound}/${metadata.size}`)
      res.set('Content-Length', (upperBound - byteRange[0] + 1).toString())
    } else if (metadata.size != null) {
      res.set('Content-Length', metadata.size.toString())
    }
  } else {
    const contentType = metadata.isEncrypted ? 'application/octet-stream' : 'application/zip'
    res.set('Content-Type', contentType)
  }

  res.set('Content-Disposition', buildDisposition(req, metadata, fileName))

  return { shouldDecompressBody }
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

export const getByteRange = (req: Request, fileSize?: number | bigint): ByteRange | undefined => {
  const byteRange = req.headers['range']
  if (byteRange == null) {
    return undefined
  }

  // RFC 9110 §14.1.2: Range: bytes=<range-spec>
  const match = byteRange.match(/^bytes\s*(?:=|\s)\s*([0-9]*)-([0-9]*)$/i)
  if (!match) {
    return undefined
  }

  const [, startStr, endStr] = match
  if (!startStr && !endStr) {
    return undefined
  }

  const size = fileSize != null ? Number(fileSize) : undefined

  // Suffix byte range: "-<suffix-length>" (e.g. "-500")
  if (!startStr && endStr) {
    const suffixLength = Number(endStr)
    if (suffixLength <= 0 || !Number.isInteger(suffixLength)) {
      return undefined
    }
    if (size == null || size <= 0) {
      return undefined
    }
    const startNumber = Math.max(0, size - suffixLength)
    const endNumber = size - 1
    return [startNumber, endNumber]
  }

  const startNumber = Number(startStr)
  if (!Number.isInteger(startNumber) || startNumber < 0) {
    return undefined
  }

  let endNumber = endStr && endStr !== '*' ? Number(endStr) : undefined
  if (endNumber !== undefined) {
    if (!Number.isInteger(endNumber) || endNumber < 0 || startNumber > endNumber) {
      return undefined
    }
  }

  if (size != null) {
    if (startNumber >= size) {
      return undefined
    }
    if (endNumber === undefined || endNumber >= size) {
      endNumber = size - 1
    }
  }

  return [startNumber, endNumber]
}
