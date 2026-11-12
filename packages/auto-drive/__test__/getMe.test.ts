import { getMe } from '../src/api/calls/read'
import { AccountInfo } from '../src/api/models/user'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

describe('getMe', () => {
  const dummyHandler: AutoDriveApiHandler = {
    sendAPIRequest: jest.fn(),
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://demo.auto-drive.autonomys.xyz/api',
    downloadBaseUrl: 'https://public.taurus.auto-drive.autonomys.xyz/api',
  }

  // What GET /accounts/@me returns: the account and its pending credits
  const mockAccountInfo: AccountInfo = {
    id: 'account-1',
    organizationId: 'org-1',
    uploadLimit: 1000,
    downloadLimit: 1000,
    model: 'monthly',
    isPartner: false,
    maxPurchasedBytes: null,
    creditExpiryDays: null,
    pendingUploadCredits: 50,
    pendingDownloadCredits: 40,
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should call /accounts/@me with GET method and return the account info', async () => {
    const sendAPIRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockAccountInfo),
    } as unknown as Response)

    const api = { ...dummyHandler, sendAPIRequest }
    const result = await getMe(api)

    expect(sendAPIRequest).toHaveBeenCalledWith('/accounts/@me', {
      method: 'GET',
    })
    expect(result).toEqual(mockAccountInfo)
  })

  it('should throw an error when API response is not ok', async () => {
    const sendAPIRequest = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        statusText: 'Unauthorized',
      }),
    )

    const api = { ...dummyHandler, sendAPIRequest }
    await expect(getMe(api)).rejects.toThrow('Failed to get limits: Unauthorized')
  })

  it('getPendingCredits and getSubscriptionInfo read the account', async () => {
    const sendAPIRequest = jest.fn(
      async () => new Response(JSON.stringify(mockAccountInfo), { status: 200 }),
    )
    const autoDrive = createApiInterface({ ...dummyHandler, sendAPIRequest })

    await expect(autoDrive.getPendingCredits()).resolves.toEqual({ upload: 50, download: 40 })
    await expect(autoDrive.getSubscriptionInfo()).resolves.toEqual({
      id: 'account-1',
      organizationId: 'org-1',
      uploadLimit: 1000,
      downloadLimit: 1000,
      granularity: 'monthly',
      pendingUploadCredits: 50,
      pendingDownloadCredits: 40,
    })
  })
})
