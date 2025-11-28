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

const buildDisposition = (type: 'inline' | 'attachment', filename: string) => {
  const fallbackName = toAsciiFallback(filename || 'download')
  const encoded = rfc5987Encode(filename || 'download')
  return `${type}; filename="${fallbackName}"; filename*=UTF-8''${encoded}`
}

const isExpectedDocument = (req: Request) => {
  return (
    req.headers['sec-fetch-site'] === 'none' ||
    (req.headers['sec-fetch-site'] === 'same-site' && req.headers['sec-fetch-mode'] === 'navigate')
  )
}

export const handleDownloadResponseHeaders = (
  req: Request,
  res: Response,
  metadata: DownloadMetadata,
  options: DownloadOptions,
) => {
  const fileName = metadata.name || 'download'
  const documentExpected = isExpectedDocument(req)
  const shouldHandleEncoding = req.query.ignoreEncoding
    ? req.query.ignoreEncoding !== 'true'
    : documentExpected

  const isEncrypted = metadata.isEncrypted
  if (metadata.type === 'file') {
    setFileResponseHeaders(
      res,
      metadata,
      isEncrypted,
      documentExpected,
      shouldHandleEncoding,
      fileName,
      options,
    )
  } else {
    setFolderResponseHeaders(res, isEncrypted, documentExpected, fileName)
  }
}

const setFileResponseHeaders = (
  res: Response,
  metadata: DownloadMetadata,
  isEncrypted: boolean,
  isExpectedDocument: boolean,
  shouldHandleEncoding: boolean,
  fileName: string,
  { byteRange = undefined, rawMode = false }: DownloadOptions,
) => {
  const contentType = !isEncrypted && !rawMode ? getMimeType(metadata) : 'application/octet-stream'
  res.set('Content-Type', contentType)
  res.set(
    'Content-Disposition',
    buildDisposition(isExpectedDocument ? 'inline' : 'attachment', fileName),
  )
  const compressedButNoEncrypted = metadata.isCompressed && !isEncrypted

  if (compressedButNoEncrypted && shouldHandleEncoding && !rawMode && !byteRange) {
    res.set('Content-Encoding', 'deflate')
  }

  if (byteRange) {
    res.status(206)
    res.set('Content-Range', `bytes ${byteRange[0]}-${byteRange[1]}/${metadata.size}`)
    const upperBound = byteRange[1] ?? Number(metadata.size) - 1
    res.set('Content-Length', (upperBound - byteRange[0] + 1).toString())
  } else if (metadata.size) {
    res.set('Content-Length', metadata.size.toString())
  }
}

const setFolderResponseHeaders = (
  res: Response,
  isEncrypted: boolean,
  isExpectedDocument: boolean,
  fileName: string,
) => {
  const contentType = isEncrypted ? 'application/octet-stream' : 'application/zip'
  res.set('Content-Type', contentType)
  res.set(
    'Content-Disposition',
    buildDisposition(isExpectedDocument ? 'inline' : 'attachment', `${fileName}.zip`),
  )
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

export const getByteRange = (req: Request): ByteRange | undefined => {
  const byteRange = req.headers['range']
  if (byteRange == null) {
    return undefined
  }
  const header = 'bytes '

  const [start, end] = byteRange.slice(header.length).split('-')
  const startNumber = Number(start)
  const endNumber = end && !['*', ''].includes(end) ? Number(end) : undefined

  if (startNumber < 0 || (endNumber && endNumber < 0) || (endNumber && startNumber > endNumber)) {
    return undefined
  }

  return [startNumber, endNumber]
}
