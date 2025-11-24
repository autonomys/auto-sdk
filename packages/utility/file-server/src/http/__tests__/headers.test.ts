import { jest } from '@jest/globals'
import { DownloadMetadata } from '../../models.js'
import { handleDownloadResponseHeaders } from '../headers.js'

// Mock Express types
const createMockReq = (
  headers: Record<string, string | string[]> = {},
  query: Record<string, string> = {},
) => ({
  headers,
  query,
})

const createMockRes = () => {
  const headers: Record<string, string> = {}
  let statusCode = 200
  return {
    set: jest.fn((key: string, value: string) => {
      headers[key.toLowerCase()] = value
    }),
    status: jest.fn((code: number) => {
      statusCode = code
    }),
    // Helper to inspect state
    _getHeaders: () => headers,
    _getStatus: () => statusCode,
  }
}

describe('handleDownloadResponseHeaders', () => {
  const defaultMetadata: DownloadMetadata = {
    name: 'test-file.txt',
    type: 'file',
    mimeType: 'text/plain',
    size: BigInt(100),
    isEncrypted: false,
    isCompressed: false,
  }

  describe('Content-Disposition', () => {
    it('should default to inline for standard requests', () => {
      const req = createMockReq()
      const res = createMockRes()

      handleDownloadResponseHeaders(req as any, res as any, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(
          /^inline; filename="test-file\.txt"; filename\*=UTF-8''test-file\.txt$/,
        ),
      )
    })

    it('should be attachment when ?download=true or ?download is present', () => {
      const req1 = createMockReq({}, { download: 'true' })
      const res1 = createMockRes()
      handleDownloadResponseHeaders(req1 as any, res1 as any, defaultMetadata, {})
      expect(res1.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment;/),
      )

      const req2 = createMockReq({}, { download: '' })
      const res2 = createMockRes()
      handleDownloadResponseHeaders(req2 as any, res2 as any, defaultMetadata, {})
      expect(res2.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment;/),
      )
    })

    it('should ignore ?download=false and use default behavior', () => {
      const req = createMockReq({}, { download: 'false' })
      const res = createMockRes()

      handleDownloadResponseHeaders(req as any, res as any, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^inline;/))
    })

    it('should be inline when ?inline=true or ?inline is present, even if fetch headers suggest otherwise', () => {
      const req1 = createMockReq({ 'sec-fetch-dest': 'image' }, { inline: 'true' })
      const res1 = createMockRes()
      handleDownloadResponseHeaders(req1 as any, res1 as any, defaultMetadata, {})
      expect(res1.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^inline;/),
      )

      const req2 = createMockReq({ 'sec-fetch-dest': 'image' }, { inline: '' })
      const res2 = createMockRes()
      handleDownloadResponseHeaders(req2 as any, res2 as any, defaultMetadata, {})
      expect(res2.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^inline;/),
      )
    })

    it('should ignore ?inline=false and use default behavior', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'image' }, { inline: 'false' })
      const res = createMockRes()

      handleDownloadResponseHeaders(req as any, res as any, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment;/),
      )
    })

    it('should be inline when ?inline is present, even if fetch headers suggest otherwise', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'image' }, { inline: 'true' })
      const res = createMockRes()

      handleDownloadResponseHeaders(req as any, res as any, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^inline;/))
    })

    it('should default to attachment for non-document destinations (e.g. img)', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'image' })
      const res = createMockRes()

      handleDownloadResponseHeaders(req as any, res as any, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment;/),
      )
    })

    it('should default to attachment for non-navigate modes (e.g. fetch)', () => {
      const req = createMockReq({ 'sec-fetch-mode': 'cors' })
      const res = createMockRes()

      handleDownloadResponseHeaders(req as any, res as any, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment;/),
      )
    })
  })

  describe('Content-Type', () => {
    it('should use mimeType for unencrypted files', () => {
      const req = createMockReq()
      const res = createMockRes()

      handleDownloadResponseHeaders(req as any, res as any, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/plain')
    })

    it('should use application/octet-stream for encrypted files', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isEncrypted: true }

      handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/octet-stream')
    })

    it('should use application/zip for folders', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, type: 'folder' as const }

      handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/zip')
    })

    it('should use application/octet-stream for encrypted folders', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, type: 'folder' as const, isEncrypted: true }

      handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/octet-stream')
    })
  })

  describe('Content-Encoding', () => {
    it('should set deflate when compressed, not encrypted, and not raw/partial', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Encoding', 'deflate')
    })

    it('should NOT set deflate if encrypted', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true, isEncrypted: true }

      handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
    })

    it('should NOT set deflate if ignoreEncoding=true', () => {
      const req = createMockReq({}, { ignoreEncoding: 'true' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
    })
  })

  describe('Range Requests', () => {
    it('should handle byte ranges', () => {
      const req = createMockReq()
      const res = createMockRes()
      const options = { byteRange: [0, 49] as [number, number] }

      handleDownloadResponseHeaders(req as any, res as any, defaultMetadata, options)

      expect(res.status).toHaveBeenCalledWith(206)
      expect(res.set).toHaveBeenCalledWith('Content-Range', 'bytes 0-49/100')
      expect(res.set).toHaveBeenCalledWith('Content-Length', '50')
    })
  })
})
