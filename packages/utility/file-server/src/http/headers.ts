import { CompressionAlgorithm, EncryptionAlgorithm } from '@autonomys/auto-dag-data'
import { Request, Response } from 'express'
import { ByteRange, DownloadMetadata, DownloadOptions } from '../models.js'

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
  const safeName = encodeURIComponent(metadata.name || 'download')
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
      safeName,
      options,
    )
  } else {
    setFolderResponseHeaders(res, isEncrypted, documentExpected, safeName)
  }
}

const setFileResponseHeaders = (
  res: Response,
  metadata: DownloadMetadata,
  isEncrypted: boolean,
  isExpectedDocument: boolean,
  shouldHandleEncoding: boolean,
  safeName: string,
  { byteRange = undefined, rawMode = false }: DownloadOptions,
) => {
  const contentType = (!isEncrypted && !rawMode && metadata.mimeType) || 'application/octet-stream'
  res.set('Content-Type', contentType)
  res.set(
    'Content-Disposition',
    `${isExpectedDocument ? 'inline' : 'attachment'}; filename="${safeName}"`,
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
  safeName: string,
) => {
  const contentType = isEncrypted ? 'application/octet-stream' : 'application/zip'
  res.set('Content-Type', contentType)
  res.set(
    'Content-Disposition',
    `${isExpectedDocument ? 'inline' : 'attachment'}; filename="${safeName}.zip"`,
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
