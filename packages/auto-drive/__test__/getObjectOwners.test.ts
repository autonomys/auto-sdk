import { getObjectOwners } from '../src/api/calls/read'
import { Owner, OwnerRole } from '../src/api/models/objects'
import { AutoDriveApiHandler } from '../src/api/types'

describe('getObjectOwners', () => {
  const cid = 'bafkr6itest'
  const owners: Owner[] = [
    { oauthProvider: 'google', oauthUserId: 'user-123', role: OwnerRole.ADMIN },
  ]

  // The server only has GET /objects/:cid, which returns the owners with the object
  // information; any other path is a 404
  const createHandler = (objectOwners: Owner[]) => {
    const sendAPIRequest = jest.fn(async (relativeUrl: string) =>
      relativeUrl === `/objects/${cid}`
        ? new Response(JSON.stringify({ cid, owners: objectOwners }), { status: 200 })
        : new Response(`Cannot GET ${relativeUrl}`, { status: 404 }),
    )
    const handler: AutoDriveApiHandler = {
      sendAPIRequest,
      sendDownloadRequest: jest.fn(),
      baseUrl: 'https://example.com/api',
      downloadBaseUrl: 'https://example.com/downloads',
    }
    return { handler, sendAPIRequest }
  }

  it('should read the owners from the object information route of the server', async () => {
    const { handler, sendAPIRequest } = createHandler(owners)

    await expect(getObjectOwners(handler, { cid })).resolves.toEqual(owners)
    expect(sendAPIRequest).toHaveBeenCalledWith(`/objects/${cid}`, { method: 'GET' })
  })

  it('should return an empty list when the server lists no owners for the caller', async () => {
    const { handler } = createHandler([])

    await expect(getObjectOwners(handler, { cid })).resolves.toEqual([])
  })

  it('should fail when the object does not exist', async () => {
    const handler: AutoDriveApiHandler = {
      sendAPIRequest: jest.fn(
        async () => new Response(JSON.stringify({ error: 'Object not found' }), { status: 404 }),
      ),
      sendDownloadRequest: jest.fn(),
      baseUrl: 'https://example.com/api',
      downloadBaseUrl: 'https://example.com/downloads',
    }

    await expect(getObjectOwners(handler, { cid })).rejects.toThrow(
      'Failed to get object: Object not found',
    )
  })

  it('should type the owners as the server sends them', async () => {
    const { handler } = createHandler(owners)

    const [owner] = await getObjectOwners(handler, { cid })
    const { oauthProvider, oauthUserId }: { oauthProvider: string; oauthUserId: string } = owner
    expect({ oauthProvider, oauthUserId }).toEqual({
      oauthProvider: 'google',
      oauthUserId: 'user-123',
    })
    // @ts-expect-error the server has not sent publicId since it moved to oauth accounts
    expect(owner.publicId).toBeUndefined()
  })
})
