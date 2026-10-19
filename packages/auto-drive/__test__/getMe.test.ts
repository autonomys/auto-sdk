import { getMe } from '../src/api/calls/read'
import { UserInfo, UserRole } from '../src/api/models/user'
import { AutoDriveApiHandler } from '../src/api/types'

describe('getMe', () => {
  const dummyHandler: AutoDriveApiHandler = {
    sendAPIRequest: jest.fn(),
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://demo.auto-drive.autonomys.xyz/api',
    downloadBaseUrl: 'https://public.taurus.auto-drive.autonomys.xyz/api',
  }

  const mockUserInfo: UserInfo = {
    user: {
      oauthProvider: 'github',
      oauthUserId: '123',
      role: UserRole.User,
      downloadCredits: 100,
      uploadCredits: 100,
      publicId: 'user-1',
      onboarded: true,
    },
    subscription: {
      id: 'sub-1',
      organizationId: 'org-1',
      uploadLimit: 1000,
      downloadLimit: 1000,
      granularity: 'monthly',
      pendingUploadCredits: 50,
      pendingDownloadCredits: 50,
    },
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should call /accounts/@me with GET method and return user info', async () => {
    const sendAPIRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserInfo),
    } as unknown as Response)

    const api = { ...dummyHandler, sendAPIRequest }
    const result = await getMe(api)

    expect(sendAPIRequest).toHaveBeenCalledWith('/accounts/@me', {
      method: 'GET',
    })
    expect(result).toEqual(mockUserInfo)
  })

  it('should throw an error when API response is not ok', async () => {
    const sendAPIRequest = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as unknown as Response)

    const api = { ...dummyHandler, sendAPIRequest }
    await expect(getMe(api)).rejects.toThrow('Failed to get limits: Unauthorized')
  })
})
