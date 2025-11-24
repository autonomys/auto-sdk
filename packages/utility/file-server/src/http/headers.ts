import { CompressionAlgorithm, EncryptionAlgorithm } from '@autonomys/auto-dag-data'
import { Request, Response } from 'express'
import { ByteRange, DownloadMetadata, DownloadOptions } from '../models.js'

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
// (mirrors the logic in canDisplayDirectly but on DownloadMetadata)
const isPreviewableInline = (metadata: DownloadMetadata) => {
  if (metadata.isEncrypted) return false

  const mimeType = metadata.mimeType?.toLowerCase() ?? ''
  const extension = metadata.name?.split('.').pop()?.toLowerCase() ?? ''

  const directDisplayTypes = ['image/', 'video/', 'audio/']
  const directDisplayExtensions = [
    // Images
    'jpg',
    'jpeg',
    'png',
    'gif',
    'svg',
    'webp',
    'bmp',
    'ico',
    // Videos
    'mp4',
    'webm',
    'avi',
    'mov',
    'mkv',
    'flv',
    'wmv',
    // Audio
    'mp3',
    'wav',
    'ogg',
    'flac',
    'm4a',
    'aac',
    // PDFs
    'pdf',
  ]

  return (
    directDisplayTypes.some((type) => mimeType.startsWith(type)) ||
    mimeType === 'application/pdf' ||
    directDisplayExtensions.includes(extension)
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

const buildDisposition = (req: Request, metadata: DownloadMetadata, filename: string) => {
  const fallbackName = toAsciiFallback(filename || 'download')
  const encoded = rfc5987Encode(filename || 'download')
  const type = isInlineDisposition(req, metadata) ? 'inline' : 'attachment'
  return `${type}; filename="${fallbackName}"; filename*=UTF-8''${encoded}`
}

export const handleDownloadResponseHeaders = (
  req: Request,
  res: Response,
  metadata: DownloadMetadata,
  { byteRange = undefined, rawMode = false }: DownloadOptions,
) => {
  const baseName = metadata.name || 'download'
  const fileName = metadata.type === 'file' ? baseName : `${baseName}.zip`

  if (metadata.type === 'file') {
    const contentType =
      (!metadata.isEncrypted && !rawMode && metadata.mimeType) || 'application/octet-stream'
    res.set('Content-Type', contentType)

    // Advertise range support for files so browsers like Chrome can seek in media
    if (metadata.size != null) {
      res.set('Accept-Ranges', 'bytes')
    }

    const compressedButNotEncrypted = metadata.isCompressed && !metadata.isEncrypted

    // Only set Content-Encoding for document navigations where browsers auto-decompress
    // Don't set it for <img>, <video>, fetch(), etc. as browsers won't auto-decompress those
    const shouldHandleEncoding = req.query.ignoreEncoding
      ? req.query.ignoreEncoding !== 'true'
      : isDocumentNavigation(req)

    if (compressedButNotEncrypted && shouldHandleEncoding && !rawMode && !byteRange) {
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
  } else {
    const contentType = metadata.isEncrypted ? 'application/octet-stream' : 'application/zip'
    res.set('Content-Type', contentType)
  }

  res.set('Content-Disposition', buildDisposition(req, metadata, fileName))
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
