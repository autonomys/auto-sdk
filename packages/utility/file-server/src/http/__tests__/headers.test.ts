import { jest } from '@jest/globals'
import type { Request, Response } from 'express'
import { DownloadMetadata, DownloadOptions } from '../../models.js'
import {
  getByteRange,
  handleDownloadResponseHeaders,
  resolveByteRange,
  sendRangeNotSatisfiable,
} from '../headers.js'

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
    end: jest.fn(),
    // Helper to inspect state
    _getHeaders: () => headers,
    _getStatus: () => statusCode,
  }
}

const requestWithRange = (range?: string) =>
  createMockReq(range === undefined ? {} : { range }) as unknown as Request

// More digits than a double holds exactly
const HUGE = '9'.repeat(30)

// The handler only touches req.headers/query and res.set/status, which the mocks provide
const callHandler = (
  req: ReturnType<typeof createMockReq>,
  res: ReturnType<typeof createMockRes>,
  metadata: DownloadMetadata,
  options: DownloadOptions,
) =>
  handleDownloadResponseHeaders(
    req as unknown as Request,
    res as unknown as Response,
    metadata,
    options,
  )

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

      callHandler(req, res, defaultMetadata, {})

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
      callHandler(req1, res1, defaultMetadata, {})
      expect(res1.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment;/),
      )

      const req2 = createMockReq({}, { download: '' })
      const res2 = createMockRes()
      callHandler(req2, res2, defaultMetadata, {})
      expect(res2.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment;/),
      )
    })

    it('should ignore ?download=false and use default behavior', () => {
      const req = createMockReq({}, { download: 'false' })
      const res = createMockRes()

      callHandler(req, res, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^inline;/))
    })

    it('should be inline when ?inline=true or ?inline is present, even if fetch headers suggest otherwise', () => {
      const req1 = createMockReq({ 'sec-fetch-dest': 'image' }, { inline: 'true' })
      const res1 = createMockRes()
      callHandler(req1, res1, defaultMetadata, {})
      expect(res1.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^inline;/),
      )

      const req2 = createMockReq({ 'sec-fetch-dest': 'image' }, { inline: '' })
      const res2 = createMockRes()
      callHandler(req2, res2, defaultMetadata, {})
      expect(res2.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^inline;/),
      )
    })

    it('should ignore ?inline=false and use default behavior', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'image' }, { inline: 'false' })
      const res = createMockRes()

      callHandler(req, res, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment;/),
      )
    })

    it('should handle filenames with special characters correctly', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, name: 'my file with "quotes".txt' }

      callHandler(req, res, metadata, {})

      const disposition = res._getHeaders()['content-disposition']
      // filename should have escaped quotes, filename* should be RFC 5987 encoded
      expect(disposition).toMatch(/filename="my file with \\"quotes\\"\.txt"/)
      expect(disposition).toMatch(/filename\*=UTF-8''my%20file%20with%20%22quotes%22\.txt/)
    })

    it('should handle filenames with Unicode characters correctly', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, name: '文件.txt' }

      callHandler(req, res, metadata, {})

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

      callHandler(req, res, metadata, {})

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

      callHandler(req, res, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment;/),
      )
    })

    it('should default to attachment for non-navigate modes (e.g. fetch)', () => {
      const req = createMockReq({ 'sec-fetch-mode': 'cors' })
      const res = createMockRes()

      callHandler(req, res, defaultMetadata, {})

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

      callHandler(req, res, metadata, {})

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

      callHandler(req, res, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/plain')
    })

    it('should use application/octet-stream for encrypted files', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isEncrypted: true }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/octet-stream')
    })

    it('should use application/zip for folders', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, type: 'folder' as const }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/zip')
    })

    it('should use application/octet-stream for encrypted folders', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, type: 'folder' as const, isEncrypted: true }

      callHandler(req, res, metadata, {})

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

        callHandler(req, res, metadata, {})

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

        callHandler(req, res, metadata, {})

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

        callHandler(req, res, metadata, {})

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

        callHandler(req, res, metadata, {})

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

        callHandler(req, res, metadata, {})

        expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/zip')
      })
    })
  })

  describe('Content-Encoding', () => {
    it('should set deflate when compressed, not encrypted, and not raw/partial', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = callHandler(req, res, metadata, {})

      expect(result.shouldDecompressBody).toBe(false)
      expect(res.set).toHaveBeenCalledWith('Content-Encoding', 'deflate')
    })

    it('should NOT set deflate if encrypted', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true, isEncrypted: true }

      callHandler(req, res, metadata, {})

      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
    })

    it('should NOT set deflate if ignoreEncoding=true', () => {
      const req = createMockReq({}, { ignoreEncoding: 'true' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      callHandler(req, res, metadata, {})

      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
    })

    it('should NOT set deflate for non-document requests (e.g. <img> tags)', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'image' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = callHandler(req, res, metadata, {})

      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
      expect(result.shouldDecompressBody).toBe(true)
    })

    it('should NOT set deflate for non-navigate requests (e.g. fetch API)', () => {
      const req = createMockReq({ 'sec-fetch-mode': 'cors' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = callHandler(req, res, metadata, {})

      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
      expect(result.shouldDecompressBody).toBe(true)
    })

    it('should NOT set deflate for non-document requests even with ?inline override', () => {
      // Even if ?inline=true forces inline disposition, Content-Encoding should
      // only be set for actual document navigations (browsers won't auto-decompress for <img>)
      const req = createMockReq({ 'sec-fetch-dest': 'image' }, { inline: 'true' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = callHandler(req, res, metadata, {})

      // Should NOT set Content-Encoding because it's not a document navigation
      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
      expect(result.shouldDecompressBody).toBe(true)
    })

    it('should set deflate for actual document navigations', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Encoding', 'deflate')
      expect(result.shouldDecompressBody).toBe(false)
    })

    it('should NOT advertise the decompressed Content-Length when Content-Encoding is set', () => {
      // Regression: Content-Length must describe the encoded (compressed) length on the
      // wire, not the decompressed metadata.size. Since the compressed length is unknown
      // here, omit Content-Length and rely on chunked transfer encoding.
      const req = createMockReq({ 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Encoding', 'deflate')
      const headers = res._getHeaders()
      expect(headers['content-length']).toBeUndefined()
    })

    it('should NOT advertise byte ranges when Content-Encoding is set (compressed body on wire)', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Encoding', 'deflate')
      expect(res.set).toHaveBeenCalledWith('Accept-Ranges', 'none')
    })

    it('should flag decompression for media types even when encoding skipped', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'video', 'sec-fetch-mode': 'no-cors' })
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        isCompressed: true,
        mimeType: 'video/mp4',
      }

      const result = callHandler(req, res, metadata, {})

      expect(result.shouldDecompressBody).toBe(true)
      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
    })
  })

  describe('Range Requests', () => {
    it('should handle byte ranges', () => {
      const req = createMockReq()
      const res = createMockRes()
      const options = { byteRange: [0, 49] as [number, number] }

      callHandler(req, res, defaultMetadata, options)

      expect(res.status).toHaveBeenCalledWith(206)
      expect(res.set).toHaveBeenCalledWith('Content-Range', 'bytes 0-49/100')
      expect(res.set).toHaveBeenCalledWith('Content-Length', '50')
    })

    it('should flag decompression when compressed file has byteRange', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }
      const options = { byteRange: [0, 49] as [number, number] }

      const result = callHandler(req, res, metadata, options)

      expect(result.shouldDecompressBody).toBe(true)
      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
    })

    it('should not emit 206/Content-Length/Content-Range for a compressed range request', () => {
      // Compressed files decompress server-side, so the requested byte range can't be
      // honored against the decompressed body: we fall back to a full chunked response.
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }
      const options = { byteRange: [0, 49] as [number, number] }

      callHandler(req, res, metadata, options)

      expect(res.status).not.toHaveBeenCalledWith(206)
      expect(res.set).not.toHaveBeenCalledWith('Content-Range', expect.anything())
      expect(res._getHeaders()['content-length']).toBeUndefined()
      expect(res.set).toHaveBeenCalledWith('Accept-Ranges', 'none')
    })

    it('should not flag an unsatisfiable range by default', () => {
      const result = callHandler(createMockReq(), createMockRes(), defaultMetadata, {})

      expect(result.rangeNotSatisfiable).toBe(false)
    })

    it('should clamp an end past the last byte', () => {
      const res = createMockRes()

      callHandler(createMockReq(), res, defaultMetadata, { byteRange: [0, 999] })

      expect(res.status).toHaveBeenCalledWith(206)
      expect(res._getHeaders()['content-range']).toBe('bytes 0-99/100')
      expect(res._getHeaders()['content-length']).toBe('100')
    })

    it.each<[string, [number, number]]>([
      ['not a safe integer', [10, 1e20]],
      ['Infinity', [10, Infinity]],
    ])('should clamp an end that is %s', (_, byteRange) => {
      const res = createMockRes()

      callHandler(createMockReq(), res, defaultMetadata, { byteRange })

      expect(res.status).toHaveBeenCalledWith(206)
      expect(res._getHeaders()['content-range']).toBe('bytes 10-99/100')
      expect(res._getHeaders()['content-length']).toBe('90')
    })

    it('should serve a single byte for [0, 0]', () => {
      const res = createMockRes()

      callHandler(createMockReq(), res, defaultMetadata, { byteRange: [0, 0] })

      expect(res.status).toHaveBeenCalledWith(206)
      expect(res._getHeaders()['content-range']).toBe('bytes 0-0/100')
      expect(res._getHeaders()['content-length']).toBe('1')
    })

    it.each<[string, [number, number | undefined]]>([
      ['at the end of the file', [100, undefined]],
      ['past the end of the file', [150, 200]],
      // A caller that clamps the end to the last byte before calling inverts these
      ['at the end of the file, end clamped', [100, 99]],
      ['past the end of the file, end clamped', [150, 99]],
      ['that is not a safe integer', [1e20, undefined]],
      ['of Infinity', [Infinity, undefined]],
    ])('should answer 416 for a start %s', (_, byteRange) => {
      const res = createMockRes()

      const result = callHandler(createMockReq(), res, defaultMetadata, { byteRange })

      expect(result.rangeNotSatisfiable).toBe(true)
      expect(res.status).toHaveBeenCalledWith(416)
      expect(res._getHeaders()['content-range']).toBe('bytes */100')
      expect(res._getHeaders()['content-length']).toBeUndefined()
    })

    it('should answer 416 for any range on an empty file', () => {
      const res = createMockRes()
      const metadata = { ...defaultMetadata, size: BigInt(0) }

      const result = callHandler(createMockReq(), res, metadata, { byteRange: [0, undefined] })

      expect(result.rangeNotSatisfiable).toBe(true)
      expect(res.status).toHaveBeenCalledWith(416)
      expect(res._getHeaders()['content-range']).toBe('bytes */0')
    })

    it.each<[string, [number, number | undefined]]>([
      ['inverted', [5, 0]],
      ['NaN', [0, NaN]],
      ['negative', [-1, 10]],
      ['fractional', [1.5, 3]],
    ])('should ignore an invalid (%s) range and describe the full file', (_, byteRange) => {
      const res = createMockRes()

      const result = callHandler(createMockReq(), res, defaultMetadata, { byteRange })

      expect(result.rangeNotSatisfiable).toBe(false)
      expect(res.status).not.toHaveBeenCalled()
      expect(res._getHeaders()['content-range']).toBeUndefined()
      expect(res._getHeaders()['content-length']).toBe('100')
    })

    describe('from a Range header', () => {
      type Expected = {
        status?: number
        contentRange?: string
        contentLength?: string
        rangeNotSatisfiable: boolean
      }

      const respond = (range: string, byteRange: [number, number | undefined] | undefined) => {
        const res = createMockRes()
        const result = callHandler(createMockReq({ range }), res, defaultMetadata, { byteRange })
        const headers = res._getHeaders()
        return {
          status: res.status.mock.calls[0]?.[0],
          contentRange: headers['content-range'],
          contentLength: headers['content-length'],
          rangeNotSatisfiable: result.rangeNotSatisfiable,
        }
      }

      it.each<[string, Expected]>([
        ['bytes=100-', { status: 416, contentRange: 'bytes */100', rangeNotSatisfiable: true }],
        [
          'bytes=0-999',
          {
            status: 206,
            contentRange: 'bytes 0-99/100',
            contentLength: '100',
            rangeNotSatisfiable: false,
          },
        ],
        // Without the size a suffix range can't be expressed, so the whole file is served
        ['bytes=-10', { contentLength: '100', rangeNotSatisfiable: false }],
        ['bytes=5-0', { contentLength: '100', rangeNotSatisfiable: false }],
        ['bytes=0-9, 20-29', { contentLength: '100', rangeNotSatisfiable: false }],
        [
          `bytes=10-${HUGE}`,
          {
            status: 206,
            contentRange: 'bytes 10-99/100',
            contentLength: '90',
            rangeNotSatisfiable: false,
          },
        ],
        [`bytes=${HUGE}-`, { status: 416, contentRange: 'bytes */100', rangeNotSatisfiable: true }],
      ])('via getByteRange: %s', (range, expected) => {
        expect(respond(range, getByteRange(requestWithRange(range)))).toEqual(expected)
      })

      it.each<[string, Expected]>([
        [
          'bytes=-10',
          {
            status: 206,
            contentRange: 'bytes 90-99/100',
            contentLength: '10',
            rangeNotSatisfiable: false,
          },
        ],
        [
          'bytes=-1000',
          {
            status: 206,
            contentRange: 'bytes 0-99/100',
            contentLength: '100',
            rangeNotSatisfiable: false,
          },
        ],
        [
          'bytes=0-999',
          {
            status: 206,
            contentRange: 'bytes 0-99/100',
            contentLength: '100',
            rangeNotSatisfiable: false,
          },
        ],
      ])('via resolveByteRange: %s', (range, expected) => {
        const resolved = resolveByteRange(requestWithRange(range), defaultMetadata.size)
        const byteRange = resolved.kind === 'partial' ? resolved.byteRange : undefined

        expect(respond(range, byteRange)).toEqual(expected)
      })
    })
  })

  describe('Accept-Ranges', () => {
    it('should be bytes when size is known and not decompressing', () => {
      const req = createMockReq()
      const res = createMockRes()

      callHandler(req, res, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith('Accept-Ranges', 'bytes')
    })

    it('should be none when size is unknown', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, size: undefined }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Accept-Ranges', 'none')
    })

    it('should be none when decompressing server-side', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'image' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = callHandler(req, res, metadata, {})

      expect(result.shouldDecompressBody).toBe(true)
      expect(res.set).toHaveBeenCalledWith('Accept-Ranges', 'none')
    })
  })

  describe('Content-Length', () => {
    it('should be set when size is known and not decompressing', () => {
      const req = createMockReq()
      const res = createMockRes()

      callHandler(req, res, defaultMetadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Length', '100')
    })

    it('should NOT be set when size is unknown', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, size: undefined }

      callHandler(req, res, metadata, {})

      expect(res.set).not.toHaveBeenCalledWith('Content-Length', expect.anything())
    })

    it('should NOT be set when decompressing (uses chunked transfer)', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'image' })
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      callHandler(req, res, metadata, {})

      // Content-Length should not be set when decompressing
      const headers = res._getHeaders()
      expect(headers['content-length']).toBeUndefined()
    })
  })

  describe('rawMode option', () => {
    it('should use application/octet-stream when rawMode is true', () => {
      const req = createMockReq()
      const res = createMockRes()

      callHandler(req, res, defaultMetadata, { rawMode: true })

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/octet-stream')
    })

    it('should flag decompression when rawMode is true and file is compressed', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata = { ...defaultMetadata, isCompressed: true }

      const result = callHandler(req, res, metadata, {
        rawMode: true,
      })

      expect(result.shouldDecompressBody).toBe(true)
      expect(res.set).not.toHaveBeenCalledWith('Content-Encoding', 'deflate')
    })
  })

  describe('Folder handling', () => {
    it('should always use attachment disposition for folders', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        type: 'folder',
        name: 'my-folder',
      }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment;/),
      )
    })

    it('should append .zip extension to folder filename', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        type: 'folder',
        name: 'my-folder',
      }

      callHandler(req, res, metadata, {})

      const disposition = res._getHeaders()['content-disposition']
      expect(disposition).toMatch(/filename="my-folder\.zip"/)
      expect(disposition).toMatch(/filename\*=UTF-8''my-folder\.zip/)
    })

    it('should allow ?inline override for folders (user explicitly requested inline)', () => {
      // Note: ?inline query param takes precedence - if user explicitly wants inline, allow it
      const req = createMockReq({}, { inline: 'true' })
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        type: 'folder',
        name: 'my-folder',
      }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^inline;/))
    })
  })

  describe('Default filename', () => {
    it('should use "download" when metadata.name is empty', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        name: '',
      }

      callHandler(req, res, metadata, {})

      const disposition = res._getHeaders()['content-disposition']
      expect(disposition).toMatch(/filename="download"/)
    })

    it('should use "download.zip" for folders with empty name', () => {
      const req = createMockReq()
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        type: 'folder',
        name: '',
      }

      callHandler(req, res, metadata, {})

      const disposition = res._getHeaders()['content-disposition']
      expect(disposition).toMatch(/filename="download\.zip"/)
    })
  })

  describe('Previewable file types (inline disposition)', () => {
    it('should be inline for image files', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'image' })
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        mimeType: 'image/png',
        name: 'photo.png',
      }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^inline;/))
    })

    it('should be inline for audio files', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'audio' })
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        mimeType: 'audio/mpeg',
        name: 'song.mp3',
      }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^inline;/))
    })

    it('should be inline for PDF files', () => {
      const req = createMockReq({ 'sec-fetch-dest': 'object' })
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        mimeType: 'application/pdf',
        name: 'document.pdf',
      }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^inline;/))
    })

    it('should NOT be inline for encrypted files on subresource requests', () => {
      // For subresource requests (e.g. <img> tags), encrypted files should be attachment
      // because they're not "previewable" - the browser can't render encrypted content
      const req = createMockReq({ 'sec-fetch-dest': 'image' })
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        mimeType: 'image/png',
        name: 'photo.png',
        isEncrypted: true,
      }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment;/),
      )
    })

    it('should be inline for encrypted files on document navigation (download prompt handled by browser)', () => {
      // For document navigations, even encrypted files are inline
      // The browser will show a download prompt anyway since it can't render the content
      const req = createMockReq({ 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate' })
      const res = createMockRes()
      const metadata: DownloadMetadata = {
        ...defaultMetadata,
        mimeType: 'image/png',
        name: 'photo.png',
        isEncrypted: true,
      }

      callHandler(req, res, metadata, {})

      expect(res.set).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^inline;/))
    })
  })
})

describe('resolveByteRange', () => {
  it.each<[string | undefined, ReturnType<typeof resolveByteRange>]>([
    [undefined, { kind: 'none' }],
    ['bytes=0-49', { kind: 'partial', byteRange: [0, 49] }],
    ['bytes=0-0', { kind: 'partial', byteRange: [0, 0] }],
    ['bytes=99-', { kind: 'partial', byteRange: [99, 99] }],
    ['bytes=0-999', { kind: 'partial', byteRange: [0, 99] }],
    ['bytes=100-', { kind: 'unsatisfiable' }],
    ['bytes=150-200', { kind: 'unsatisfiable' }],
    ['bytes=-10', { kind: 'partial', byteRange: [90, 99] }],
    ['bytes=-100', { kind: 'partial', byteRange: [0, 99] }],
    ['bytes=-1000', { kind: 'partial', byteRange: [0, 99] }],
    ['bytes=-0', { kind: 'unsatisfiable' }],
    // Numerals too large for a safe integer still resolve without NaN
    [`bytes=0-${HUGE}`, { kind: 'partial', byteRange: [0, 99] }],
    [`bytes=${HUGE}-`, { kind: 'unsatisfiable' }],
    [`bytes=-${HUGE}`, { kind: 'partial', byteRange: [0, 99] }],
    // Accepted spellings
    ['BYTES=0-9', { kind: 'partial', byteRange: [0, 9] }],
    ['bytes 0-9', { kind: 'partial', byteRange: [0, 9] }],
    ['bytes= 0-9', { kind: 'partial', byteRange: [0, 9] }],
    ['bytes=0-9,', { kind: 'partial', byteRange: [0, 9] }],
    // Ignored
    ['bytes=5-0', { kind: 'none' }],
    ['bytes=0-9, 20-29', { kind: 'none' }],
    ['bytes=0-0,-1', { kind: 'none' }],
    ['bytes=-', { kind: 'none' }],
    ['bytes=', { kind: 'none' }],
    ['bytes=abc', { kind: 'none' }],
    ['bytes=0-9x', { kind: 'none' }],
    ['bytes=1.5-3', { kind: 'none' }],
    ['bytes=-5-10', { kind: 'none' }],
    ['bytes=0-*', { kind: 'none' }],
    ['items=0-9', { kind: 'none' }],
    ['0-9', { kind: 'none' }],
  ])('%s on a 100-byte file', (range, expected) => {
    expect(resolveByteRange(requestWithRange(range), BigInt(100))).toEqual(expected)
  })

  it.each<[string, ReturnType<typeof resolveByteRange>]>([
    ['bytes=0-', { kind: 'unsatisfiable' }],
    ['bytes=0-0', { kind: 'unsatisfiable' }],
    ['bytes=-0', { kind: 'unsatisfiable' }],
    // RFC 9110 calls this satisfiable, but no Content-Range can describe zero bytes
    ['bytes=-10', { kind: 'none' }],
  ])('%s on an empty file', (range, expected) => {
    expect(resolveByteRange(requestWithRange(range), BigInt(0))).toEqual(expected)
  })

  it('accepts the size as a number', () => {
    expect(resolveByteRange(requestWithRange('bytes=-10'), 100)).toEqual({
      kind: 'partial',
      byteRange: [90, 99],
    })
  })

  it('ignores the range when the size is unknown', () => {
    expect(resolveByteRange(requestWithRange('bytes=0-9'), undefined)).toEqual({ kind: 'none' })
  })
})

describe('getByteRange', () => {
  it.each<[string | undefined, ReturnType<typeof getByteRange>]>([
    [undefined, undefined],
    ['bytes=0-49', [0, 49]],
    ['bytes=0-0', [0, 0]],
    ['bytes 0-49', [0, 49]],
    // Neither clamped nor checked against the size: handleDownloadResponseHeaders does that
    ['bytes=100-', [100, undefined]],
    ['bytes=0-999', [0, 999]],
    // A suffix needs the size, so it is ignored rather than read from the start of the file
    ['bytes=-10', undefined],
    ['bytes=5-0', undefined],
    ['bytes=0-9, 20-29', undefined],
    ['bytes=abc', undefined],
    // An end too large to be exact means "to the end", and fs.createReadStream rejects it
    [`bytes=10-${HUGE}`, [10, undefined]],
    [`bytes=${HUGE}-`, [Number(HUGE), undefined]],
  ])('%s', (range, expected) => {
    expect(getByteRange(requestWithRange(range))).toEqual(expected)
  })
})

describe('sendRangeNotSatisfiable', () => {
  it('answers 416 with the representation length and no body', () => {
    const res = createMockRes()

    sendRangeNotSatisfiable(res as unknown as Response, BigInt(100))

    expect(res.status).toHaveBeenCalledWith(416)
    expect(res._getHeaders()['content-range']).toBe('bytes */100')
    expect(res.end).toHaveBeenCalledWith()
  })
})
