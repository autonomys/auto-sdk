import {
  markObjectAsDeleted,
  publishObject,
  restoreObject,
  shareObject,
} from '../src/api/calls/write'
import { AutoDriveApiHandler } from '../src/api/types'

type Route = (init: Partial<Request>, body?: BodyInit) => Response | Promise<Response>

const textResponse = (status: number, body: string = 'OK') =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  })

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const createMockApi = (routes: Record<string, Route>) => {
  const sendAPIRequest = jest.fn(
    async (url: string, init: Partial<Request>, body?: BodyInit): Promise<Response> => {
      const route = routes[`${init.method} ${url}`]
      if (!route) {
        throw new Error(`Unexpected request: ${init.method} ${url}`)
      }
      return route(init, body)
    },
  )
  const api: AutoDriveApiHandler = {
    sendAPIRequest,
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://example.invalid/api',
    downloadBaseUrl: 'https://example.invalid/downloads',
  }
  return { api, sendAPIRequest }
}

describe('Auto Drive write API calls', () => {
  const testCid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'

  describe('restoreObject', () => {
    it('sends POST /objects/:cid/restore and handles plain text 200 OK without JSON parse error', async () => {
      const { api, sendAPIRequest } = createMockApi({
        [`POST /objects/${testCid}/restore`]: () => textResponse(200, 'OK'),
      })

      await expect(restoreObject(api, { cid: testCid })).resolves.toBeUndefined()
      expect(sendAPIRequest).toHaveBeenCalledWith(`/objects/${testCid}/restore`, {
        method: 'POST',
      })
    })

    it('throws error with statusText when restore request fails', async () => {
      const { api } = createMockApi({
        [`POST /objects/${testCid}/restore`]: () =>
          new Response('Not Found', { status: 404, statusText: 'Not Found' }),
      })

      await expect(restoreObject(api, { cid: testCid })).rejects.toThrow(
        'Failed to restore object: Not Found',
      )
    })
  })

  describe('shareObject', () => {
    it('sends POST /objects/:cid/share with publicId and handles plain text 200 OK', async () => {
      let receivedBody: string | undefined
      const { api, sendAPIRequest } = createMockApi({
        [`POST /objects/${testCid}/share`]: (_init, body) => {
          receivedBody = body as string
          return textResponse(200, 'OK')
        },
      })

      await expect(
        shareObject(api, { cid: testCid, publicId: 'user-public-id-123' }),
      ).resolves.toBeUndefined()
      expect(sendAPIRequest).toHaveBeenCalledWith(
        `/objects/${testCid}/share`,
        expect.objectContaining({ method: 'POST' }),
        JSON.stringify({ publicId: 'user-public-id-123' }),
      )
      expect(receivedBody).toEqual(JSON.stringify({ publicId: 'user-public-id-123' }))
    })

    it('throws error with statusText when share request fails', async () => {
      const { api } = createMockApi({
        [`POST /objects/${testCid}/share`]: () =>
          new Response('Bad Request', { status: 400, statusText: 'Bad Request' }),
      })

      await expect(
        shareObject(api, { cid: testCid, publicId: 'user-public-id-123' }),
      ).rejects.toThrow('Failed to share object: Bad Request')
    })
  })

  describe('markObjectAsDeleted', () => {
    it('sends POST /objects/:cid/delete and resolves on 200 OK', async () => {
      const { api, sendAPIRequest } = createMockApi({
        [`POST /objects/${testCid}/delete`]: () => textResponse(200, 'OK'),
      })

      await expect(markObjectAsDeleted(api, { cid: testCid })).resolves.toBeUndefined()
      expect(sendAPIRequest).toHaveBeenCalledWith(`/objects/${testCid}/delete`, {
        method: 'POST',
      })
    })

    it('throws error when delete request fails', async () => {
      const { api } = createMockApi({
        [`POST /objects/${testCid}/delete`]: () =>
          new Response('Internal Server Error', {
            status: 500,
            statusText: 'Internal Server Error',
          }),
      })

      await expect(markObjectAsDeleted(api, { cid: testCid })).rejects.toThrow(
        'Failed to mark object as deleted: Internal Server Error',
      )
    })
  })

  describe('publishObject', () => {
    it('sends POST /objects/:cid/publish and returns parsed JSON result', async () => {
      const { api, sendAPIRequest } = createMockApi({
        [`POST /objects/${testCid}/publish`]: () =>
          jsonResponse(200, { result: 'https://example.invalid/download/test-id' }),
      })

      const res = await publishObject(api, { cid: testCid })
      expect(res).toEqual({ result: 'https://example.invalid/download/test-id' })
      expect(sendAPIRequest).toHaveBeenCalledWith(`/objects/${testCid}/publish`, {
        method: 'POST',
      })
    })

    it('throws error when publish request fails', async () => {
      const { api } = createMockApi({
        [`POST /objects/${testCid}/publish`]: () =>
          new Response('Forbidden', { status: 403, statusText: 'Forbidden' }),
      })

      await expect(publishObject(api, { cid: testCid })).rejects.toThrow(
        'Failed to publish object: Forbidden',
      )
    })
  })
})
