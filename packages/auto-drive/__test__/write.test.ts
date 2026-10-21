import { unpublishObject } from '../src/api/calls/write'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

const CID = 'bafkr6ie6bmatqklzhvyjbvbeb5lg6lptibzpcxsmzv33ttplzdw2wsl2ta'

const createMockApi = (response: () => Response) => {
  const sendAPIRequest = jest.fn<Promise<Response>, [string, Partial<Request>, BodyInit?]>(
    async () => response(),
  )
  const api: AutoDriveApiHandler = {
    sendAPIRequest,
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://example.invalid/api',
    downloadBaseUrl: 'https://example.invalid/downloads',
  }
  return { api, sendAPIRequest }
}

// What auto-drive sends: 204 with no body on success (also when the object
// was not published), and `{ error: <message> }` for a 403.
const noContent = () => new Response(null, { status: 204 })
const forbidden = () =>
  new Response(JSON.stringify({ error: 'User does not have access to this object' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })

describe('unpublishObject', () => {
  it('sends a POST to the unpublish endpoint of the CID', async () => {
    const { api, sendAPIRequest } = createMockApi(noContent)

    await unpublishObject(api, { cid: CID })

    expect(sendAPIRequest).toHaveBeenCalledTimes(1)
    expect(sendAPIRequest).toHaveBeenCalledWith(`/objects/${CID}/unpublish`, { method: 'POST' })
  })

  it('resolves on a 204 with an empty body', async () => {
    const { api } = createMockApi(noContent)

    await expect(unpublishObject(api, { cid: CID })).resolves.toBeUndefined()
  })

  it('throws with the status and the server message when the request fails', async () => {
    const { api } = createMockApi(forbidden)

    await expect(unpublishObject(api, { cid: CID })).rejects.toThrow(
      'Failed to unpublish object: 403 {"error":"User does not have access to this object"}',
    )
  })

  it('is exposed by createApiInterface', async () => {
    const { api, sendAPIRequest } = createMockApi(noContent)

    await expect(createApiInterface(api).unpublishObject(CID)).resolves.toBeUndefined()
    expect(sendAPIRequest).toHaveBeenCalledWith(`/objects/${CID}/unpublish`, { method: 'POST' })
  })
})
