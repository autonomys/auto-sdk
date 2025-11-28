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

    it('should handle filenames with special characters correctly', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, name: 'my file with "quotes".txt' }

      handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      const disposition = res._getHeaders()['content-disposition']
      // filename should have escaped quotes, filename* should be RFC 5987 encoded
      expect(disposition).toMatch(/filename="my file with \\"quotes\\"\.txt"/)
      expect(disposition).toMatch(/filename\*=UTF-8''my%20file%20with%20%22quotes%22\.txt/)
    })

    it('should handle filenames with Unicode characters correctly', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, name: '文件.txt' }

      handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      const disposition = res._getHeaders()['content-disposition']
      // filename should have consecutive non-ASCII replaced with single underscore (ASCII fallback)
      expect(disposition).toMatch(/filename="_\.txt"/)
      // filename* should properly encode Unicode using RFC 5987
      expect(disposition).toMatch(/filename\*=UTF-8''%E6%96%87%E4%BB%B6\.txt/)
    })

    it('should handle filenames with mixed ASCII and Unicode characters', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, name: 'report-отчёт-2024.pdf' }

      handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      const disposition = res._getHeaders()['content-disposition']
      // filename should preserve ASCII, replace consecutive non-ASCII with single underscore
      expect(disposition).toMatch(/filename="report-_-2024\.pdf"/)
      // filename* should encode all characters properly
      expect(disposition).toMatch(
        /filename\*=UTF-8''report-%D0%BE%D1%82%D1%87%D1%91%D1%82-2024\.pdf/,
      )
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

    it('should be inline for video mime types even for non-document destinations (e.g. <video> tags)', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'video' })
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        mimeType: 'video/mp4',
        name: 'example.mp4',
      }

      handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(res.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^inline; filename="example\.mp4"; filename\*=UTF-8''example\.mp4$/),
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

    describe('MIME type inference fallback', () => {
      it('should fall back to extension-based inference when mimeType is application/octet-stream', () => {
        const req = createMockReq()
        const res = createMockRes()
        const metadata: DownloadMetadata = {
          ...defaultMetadata,
          name: 'video.mp4',
          mimeType: 'application/octet-stream',
        }

        handleDownloadResponseHeaders(req as any, res as any, metadata, {})

        expect(res.set).toHaveBeenCalledWith('Content-Type', 'video/mp4')
      })

      it('should fall back to extension-based inference when mimeType is binary/octet-stream', () => {
        const req = createMockReq()
        const res = createMockRes()
        const metadata: DownloadMetadata = {
          ...defaultMetadata,
          name: 'image.png',
          mimeType: 'binary/octet-stream',
        }

        handleDownloadResponseHeaders(req as any, res as any, metadata, {})

        expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/png')
      })

      it('should use stored mimeType when it is meaningful (not generic)', () => {
        const req = createMockReq()
        const res = createMockRes()
        const metadata: DownloadMetadata = {
          ...defaultMetadata,
          name: 'document.pdf',
          mimeType: 'application/pdf',
        }

        handleDownloadResponseHeaders(req as any, res as any, metadata, {})

        expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/pdf')
      })

      it('should infer from extension when mimeType is undefined', () => {
        const req = createMockReq()
        const res = createMockRes()
        const metadata: DownloadMetadata = {
          ...defaultMetadata,
          name: 'music.mp3',
          mimeType: undefined,
        }

        handleDownloadResponseHeaders(req as any, res as any, metadata, {})

        expect(res.set).toHaveBeenCalledWith('Content-Type', 'audio/mpeg')
      })

      it('should handle case-insensitive generic MIME type detection', () => {
        const req = createMockReq()
        const res = createMockRes()
        const metadata: DownloadMetadata = {
          ...defaultMetadata,
          name: 'archive.zip',
          mimeType: 'APPLICATION/OCTET-STREAM', // uppercase
        }

        handleDownloadResponseHeaders(req as any, res as any, metadata, {})

        expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/zip')
      })
    })
  })

  describe('Content-Encoding', () => {
    it('should set deflate when compressed, not encrypted, and not raw/partial', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(result.shouldDecompressBody).toBe(false)
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

    it('should NOT set deflate for non-document requests (e.g. <img> tags)', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'image' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
      expect(result.shouldDecompressBody).toBe(true)
    })

    it('should NOT set deflate for non-navigate requests (e.g. fetch API)', () => {
      const req = createMockReq({ 'sec-fetch-mode': 'cors' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
      expect(result.shouldDecompressBody).toBe(true)
    })

    it('should NOT set deflate for non-document requests even with ?inline override', () => {
      // Even if ?inline=true forces inline disposition, Content-Encoding should
      // only be set for actual document navigations (browsers won't auto-decompress for <img>)
      const req = createMockReq({ 'sec-fetch-dest': 'image' }, { inline: 'true' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      // Should NOT set Content-Encoding because it's not a document navigation
      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
      expect(result.shouldDecompressBody).toBe(true)
    })

    it('should set deflate for actual document navigations', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Encoding', 'deflate')
      expect(result.shouldDecompressBody).toBe(false)
    })

    it('should flag decompression for media types even when encoding skipped', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'video', 'sec-fetch-mode': 'no-cors' })
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        isCompressed: true,
        mimeType: 'video/mp4',
      }

      const result = handleDownloadResponseHeaders(req as any, res as any, metadata, {})

      expect(result.shouldDecompressBody).toBe(true)
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
