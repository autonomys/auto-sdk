import {
  banObject,
  dismissReport,
  markObjectAsDeleted,
  publishObject,
  reportObject,
  restoreObject,
  shareObject,
} from '../src/api/calls/write'
import { AutoDriveApiHandler } from '../src/api/types'

const createMockApi = (mockFn: jest.Mock): AutoDriveApiHandler => ({
  sendAPIRequest: mockFn,
  sendDownloadRequest: jest.fn(),
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

describe('write API calls', () => {
  describe('shareObject', () => {
    it('sends POST /objects/:cid/share with publicId and Content-Type header', async () => {
      const sendReq = jest.fn().mockResolvedValue(jsonResponse({ success: true }))
      const api = createMockApi(sendReq)

      const result = await shareObject(api, { cid: 'cid-share', publicId: 'target-user' })

      expect(sendReq).toHaveBeenCalledWith(
        '/objects/cid-share/share',
        expect.objectContaining({ method: 'POST' }),
        JSON.stringify({ publicId: 'target-user' }),
      )
      expect(result).toEqual({ success: true })
    })

    it('throws formatted error on failure', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(403, 'Forbidden'))
      const api = createMockApi(sendReq)

      await expect(shareObject(api, { cid: 'cid-share', publicId: 'target-user' })).rejects.toThrow(
        'Failed to share object: 403 Forbidden',
      )
    })
  })

  describe('markObjectAsDeleted and restoreObject', () => {
    it('markObjectAsDeleted sends POST /objects/:cid/delete', async () => {
      const sendReq = jest.fn().mockResolvedValue(jsonResponse({ success: true }))
      const api = createMockApi(sendReq)

      await markObjectAsDeleted(api, { cid: 'cid-del' })

      expect(sendReq).toHaveBeenCalledWith('/objects/cid-del/delete', { method: 'POST' })
    })

    it('markObjectAsDeleted throws formatted error on failure', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(404, 'Not Found'))
      const api = createMockApi(sendReq)

      await expect(markObjectAsDeleted(api, { cid: 'cid-del' })).rejects.toThrow(
        'Failed to mark object as deleted: 404 Not Found',
      )
    })

    it('restoreObject sends POST /objects/:cid/restore', async () => {
      const sendReq = jest.fn().mockResolvedValue(jsonResponse({ restored: true }))
      const api = createMockApi(sendReq)

      const result = await restoreObject(api, { cid: 'cid-rest' })

      expect(sendReq).toHaveBeenCalledWith('/objects/cid-rest/restore', { method: 'POST' })
      expect(result).toEqual({ restored: true })
    })

    it('restoreObject throws formatted error on failure', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(400, 'Bad Request'))
      const api = createMockApi(sendReq)

      await expect(restoreObject(api, { cid: 'cid-rest' })).rejects.toThrow(
        'Failed to restore object: 400 Bad Request',
      )
    })
  })

  describe('publishObject', () => {
    it('sends POST /objects/:cid/publish', async () => {
      const sendReq = jest.fn().mockResolvedValue(jsonResponse({ published: true }))
      const api = createMockApi(sendReq)

      const result = await publishObject(api, { cid: 'cid-pub' })

      expect(sendReq).toHaveBeenCalledWith('/objects/cid-pub/publish', { method: 'POST' })
      expect(result).toEqual({ published: true })
    })

    it('throws formatted error on failure', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(500, 'Server Error'))
      const api = createMockApi(sendReq)

      await expect(publishObject(api, { cid: 'cid-pub' })).rejects.toThrow(
        'Failed to publish object: 500 Server Error',
      )
    })
  })

  describe('moderation: reportObject, banObject, dismissReport', () => {
    it('reportObject sends POST /objects/:cid/report', async () => {
      const sendReq = jest.fn().mockResolvedValue(jsonResponse({ reported: true }))
      const api = createMockApi(sendReq)

      await reportObject(api, { cid: 'cid-rep' })

      expect(sendReq).toHaveBeenCalledWith('/objects/cid-rep/report', { method: 'POST' })
    })

    it('banObject sends POST /objects/:cid/ban', async () => {
      const sendReq = jest.fn().mockResolvedValue(jsonResponse({ banned: true }))
      const api = createMockApi(sendReq)

      await banObject(api, { cid: 'cid-ban' })

      expect(sendReq).toHaveBeenCalledWith('/objects/cid-ban/ban', { method: 'POST' })
    })

    it('dismissReport sends POST /objects/:cid/dismiss', async () => {
      const sendReq = jest.fn().mockResolvedValue(jsonResponse({ dismissed: true }))
      const api = createMockApi(sendReq)

      await dismissReport(api, { cid: 'cid-dsm' })

      expect(sendReq).toHaveBeenCalledWith('/objects/cid-dsm/dismiss-report', { method: 'POST' })
    })
  })
})
