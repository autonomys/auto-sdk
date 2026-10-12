import {
  createAsyncDownload,
  dismissAsyncDownload,
  downloadObject,
  downloadStatus,
  getAsyncDownload,
  getAsyncDownloads,
  publicDownloadUrl,
} from '../src/api/calls/download'
import { DownloadStatus } from '../src/api/models/asyncDownloads'
import { AutoDriveApiHandler } from '../src/api/types'

const createMockApi = (mockFn: jest.Mock): AutoDriveApiHandler => ({
  sendAPIRequest: jest.fn(),
  sendDownloadRequest: mockFn,
  baseUrl: 'https://api.test',
  downloadBaseUrl: 'https://download.test',
})

const jsonResponse = (data: unknown, status = 200, statusText = 'OK') =>
  new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  })

const errorResponse = (status = 500, statusText = 'Internal Server Error') =>
  new Response('Error', { status, statusText })

describe('download API calls', () => {
  describe('downloadObject', () => {
    it('sends GET request to /downloads/:cid with default ignoreEncoding=true', async () => {
      const mockStream = new ReadableStream()
      const mockResponse = {
        ok: true,
        body: mockStream,
      } as unknown as Response
      const sendReq = jest.fn().mockResolvedValue(mockResponse)
      const api = createMockApi(sendReq)

      const body = await downloadObject(api, { cid: 'cid-download-1' })

      expect(sendReq).toHaveBeenCalledWith('/downloads/cid-download-1?ignoreEncoding=true', {
        method: 'GET',
      })
      expect(body).toBe(mockStream)
    })

    it('passes custom ignoreBackendEncoding=false', async () => {
      const mockStream = new ReadableStream()
      const mockResponse = {
        ok: true,
        body: mockStream,
      } as unknown as Response
      const sendReq = jest.fn().mockResolvedValue(mockResponse)
      const api = createMockApi(sendReq)

      await downloadObject(api, { cid: 'cid-2', ignoreBackendEncoding: false })

      expect(sendReq).toHaveBeenCalledWith('/downloads/cid-2?ignoreEncoding=false', {
        method: 'GET',
      })
    })

    it('throws formatted error on non-ok response', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(404, 'Not Found'))
      const api = createMockApi(sendReq)

      await expect(downloadObject(api, { cid: 'missing-cid' })).rejects.toThrow(
        'Failed to download file: 404 Not Found',
      )
    })

    it('throws error when response has no body', async () => {
      const mockResponse = {
        ok: true,
        body: null,
      } as unknown as Response
      const sendReq = jest.fn().mockResolvedValue(mockResponse)
      const api = createMockApi(sendReq)

      await expect(downloadObject(api, { cid: 'no-body' })).rejects.toThrow(
        'No body returned from download request',
      )
    })
  })

  describe('async download management', () => {
    it('createAsyncDownload calls /downloads/async/:cid with POST', async () => {
      const mockDownload = { id: 'dl-1', cid: 'cid-1' }
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockDownload))
      const api = createMockApi(sendReq)

      const result = await createAsyncDownload(api, 'cid-1')

      expect(sendReq).toHaveBeenCalledWith('/downloads/async/cid-1', { method: 'POST' })
      expect(result).toEqual(mockDownload)
    })

    it('createAsyncDownload throws on failure', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(400, 'Bad Request'))
      const api = createMockApi(sendReq)

      await expect(createAsyncDownload(api, 'cid-1')).rejects.toThrow(
        'Failed to create async download: 400 Bad Request',
      )
    })

    it('getAsyncDownload calls /downloads/async/:downloadId with GET', async () => {
      const mockDownload = { id: 'dl-1', status: 'ready' }
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockDownload))
      const api = createMockApi(sendReq)

      const result = await getAsyncDownload(api, 'dl-1')

      expect(sendReq).toHaveBeenCalledWith('/downloads/async/dl-1', { method: 'GET' })
      expect(result).toEqual(mockDownload)
    })

    it('getAsyncDownloads calls /downloads/async/@me with GET', async () => {
      const mockDownloads = [{ id: 'dl-1' }]
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockDownloads))
      const api = createMockApi(sendReq)

      const result = await getAsyncDownloads(api)

      expect(sendReq).toHaveBeenCalledWith('/downloads/async/@me', { method: 'GET' })
      expect(result).toEqual(mockDownloads)
    })

    it('dismissAsyncDownload calls /downloads/async/:downloadId/dismiss with POST', async () => {
      const sendReq = jest.fn().mockResolvedValue(jsonResponse({ success: true }))
      const api = createMockApi(sendReq)

      await dismissAsyncDownload(api, 'dl-1')

      expect(sendReq).toHaveBeenCalledWith('/downloads/async/dl-1/dismiss', { method: 'POST' })
    })

    it('downloadStatus calls /downloads/async/:cid/status and returns status', async () => {
      const sendReq = jest.fn().mockResolvedValue(jsonResponse({ status: DownloadStatus.Cached }))
      const api = createMockApi(sendReq)

      const result = await downloadStatus(api, 'cid-1')

      expect(sendReq).toHaveBeenCalledWith('/downloads/async/cid-1/status', { method: 'GET' })
      expect(result).toEqual({ status: DownloadStatus.Cached })
    })

    it('downloadStatus throws on failure', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(500, 'Internal Server Error'))
      const api = createMockApi(sendReq)

      await expect(downloadStatus(api, 'cid-1')).rejects.toThrow(
        'Failed to get download status: 500 Internal Server Error',
      )
    })
  })

  describe('publicDownloadUrl', () => {
    it('constructs correct public download URL from api.downloadBaseUrl', () => {
      const api = createMockApi(jest.fn())
      const url = publicDownloadUrl(api, 'bafybeig123')

      expect(url).toBe('https://download.test/objects/bafybeig123/public')
    })
  })
})
