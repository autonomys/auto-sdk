import { restoreObject, shareObject } from '../src/api/calls/write'
import { AutoDriveApiHandler } from '../src/api/types'

type Route = (init: Partial<Request>, body?: BodyInit) => Response | Promise<Response>

const textResponse = (status: number, body: string = 'OK') =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain' },
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
  })
})
