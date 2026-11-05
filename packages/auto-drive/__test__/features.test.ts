import { getFeatureFlags } from '../src/api/calls/features'
import { FeatureFlags } from '../src/api/models/features'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

const jsonResponse = (data: unknown, status = 200, statusText = 'OK') =>
  new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  })

const mockApi = (
  handler?: (url: string, init: RequestInit, body?: BodyInit) => Promise<Response>,
): AutoDriveApiHandler => ({
  sendAPIRequest: jest.fn(
    handler ?? (async () => jsonResponse({})),
  ),
  sendDownloadRequest: jest.fn(async () => jsonResponse({})),
  baseUrl: 'https://example.invalid/api',
  downloadBaseUrl: 'https://example.invalid/downloads',
})

describe('Feature Flags API', () => {
  describe('getFeatureFlags', () => {
    it('sends GET /features request and returns feature flags', async () => {
      let capturedUrl = ''
      let capturedMethod = ''
      const mockFlags: FeatureFlags = {
        buyCredits: true,
        payWithUsdc: false,
        usdcAvailable: false,
        newFolderUpload: true,
      }

      const api = mockApi(async (url, init) => {
        capturedUrl = url
        capturedMethod = init.method ?? 'GET'
        return jsonResponse(mockFlags)
      })

      const result = await getFeatureFlags(api)

      expect(capturedUrl).toBe('/features')
      expect(capturedMethod).toBe('GET')
      expect(result).toEqual(mockFlags)
      expect(result.buyCredits).toBe(true)
      expect(result.payWithUsdc).toBe(false)
      expect(result.usdcAvailable).toBe(false)
      expect(result.newFolderUpload).toBe(true)
    })

    it('returns empty object when no flags are configured', async () => {
      const api = mockApi(async () => jsonResponse({}))
      const result = await getFeatureFlags(api)
      expect(result).toEqual({})
    })

    it('throws formatted API error on non-OK server response', async () => {
      const api = mockApi(async () =>
        jsonResponse({ error: 'Service Unavailable' }, 503, 'Service Unavailable'),
      )

      await expect(getFeatureFlags(api)).rejects.toThrow(
        'Failed to get feature flags: Service Unavailable',
      )
    })
  })

  describe('createApiInterface wrapper', () => {
    it('binds getFeatureFlags on the client interface', async () => {
      const mockFlags: FeatureFlags = {
        buyCredits: true,
        payWithUsdc: true,
      }
      const api = mockApi(async () => jsonResponse(mockFlags))
      const client = createApiInterface(api)

      const result = await client.getFeatureFlags()

      expect(result).toEqual(mockFlags)
      expect(api.sendAPIRequest).toHaveBeenCalledWith(
        '/features',
        expect.objectContaining({ method: 'GET' }),
      )
    })
  })
})
