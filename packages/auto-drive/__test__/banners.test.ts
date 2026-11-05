import { getActiveBanners, interactWithBanner } from '../src/api/calls/banners'
import {
  Banner,
  BannerCriticality,
  BannerInteractionType,
} from '../src/api/models/banners'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

const jsonResponse = (data: unknown, status = 200, statusText = 'OK') =>
  new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  })

const noContentResponse = (status = 204, statusText = 'No Content') =>
  new Response(null, {
    status,
    statusText,
  })

const mockApi = (
  handler?: (url: string, init: RequestInit, body?: BodyInit) => Promise<Response>,
): AutoDriveApiHandler => ({
  sendAPIRequest: jest.fn(
    handler ?? (async () => jsonResponse([])),
  ),
  sendDownloadRequest: jest.fn(async () => jsonResponse({})),
  baseUrl: 'https://example.invalid/api',
  downloadBaseUrl: 'https://example.invalid/downloads',
})

const sampleBanner: Banner = {
  id: 'banner-123',
  title: 'Scheduled Maintenance',
  body: 'Auto Drive network upgrade scheduled for Nov 10, 2026.',
  criticality: BannerCriticality.Warning,
  dismissable: true,
  requiresAcknowledgement: false,
  displayStart: '2026-11-05T00:00:00.000Z',
  displayEnd: '2026-11-10T00:00:00.000Z',
  active: true,
  createdBy: 'admin-1',
  createdAt: '2026-11-05T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
}

describe('Banners API', () => {
  describe('getActiveBanners', () => {
    it('fetches active banners for authenticated user', async () => {
      let capturedUrl = ''
      let capturedMethod = ''
      const api = mockApi(async (url, init) => {
        capturedUrl = url
        capturedMethod = init.method ?? 'GET'
        return jsonResponse([sampleBanner])
      })

      const banners = await getActiveBanners(api)

      expect(capturedUrl).toBe('/banners/active')
      expect(capturedMethod).toBe('GET')
      expect(banners).toHaveLength(1)
      expect(banners[0]).toEqual(sampleBanner)
      expect(banners[0].criticality).toBe(BannerCriticality.Warning)
    })

    it('returns empty array when there are no active banners', async () => {
      const api = mockApi(async () => jsonResponse([]))
      const banners = await getActiveBanners(api)
      expect(banners).toEqual([])
    })

    it('throws formatted API error on server failure', async () => {
      const api = mockApi(async () =>
        jsonResponse({ error: 'Unauthorized access' }, 401, 'Unauthorized'),
      )

      await expect(getActiveBanners(api)).rejects.toThrow(
        'Failed to get active banners: Unauthorized access',
      )
    })
  })

  describe('interactWithBanner', () => {
    it('sends POST /banners/:id/interact with acknowledged interaction', async () => {
      let capturedUrl = ''
      let capturedMethod = ''
      let capturedBody = ''
      let capturedContentType = ''

      const api = mockApi(async (url, init, body) => {
        capturedUrl = url
        capturedMethod = init.method ?? 'POST'
        capturedBody = body as string
        const headers = init.headers as Headers
        capturedContentType = headers?.get('Content-Type') ?? ''
        return noContentResponse(204)
      })

      await interactWithBanner(api, {
        bannerId: 'banner-123',
        type: BannerInteractionType.Acknowledged,
      })

      expect(capturedUrl).toBe('/banners/banner-123/interact')
      expect(capturedMethod).toBe('POST')
      expect(capturedContentType).toBe('application/json')
      expect(JSON.parse(capturedBody)).toEqual({ type: 'acknowledged' })
    })

    it('sends POST /banners/:id/interact with dismissed interaction', async () => {
      let capturedUrl = ''
      let capturedBody = ''

      const api = mockApi(async (url, _init, body) => {
        capturedUrl = url
        capturedBody = body as string
        return noContentResponse(204)
      })

      await interactWithBanner(api, {
        bannerId: 'banner-456',
        type: BannerInteractionType.Dismissed,
      })

      expect(capturedUrl).toBe('/banners/banner-456/interact')
      expect(JSON.parse(capturedBody)).toEqual({ type: 'dismissed' })
    })

    it('encodes special characters in bannerId', async () => {
      let capturedUrl = ''
      const api = mockApi(async (url) => {
        capturedUrl = url
        return noContentResponse(204)
      })

      await interactWithBanner(api, {
        bannerId: 'banner/special:id',
        type: BannerInteractionType.Dismissed,
      })

      expect(capturedUrl).toBe('/banners/banner%2Fspecial%3Aid/interact')
    })

    it('validates bannerId is a non-empty string', async () => {
      const api = mockApi()

      await expect(
        interactWithBanner(api, {
          bannerId: '',
          type: BannerInteractionType.Acknowledged,
        }),
      ).rejects.toThrow('bannerId must be a non-empty string')

      await expect(
        interactWithBanner(api, {
          bannerId: null as unknown as string,
          type: BannerInteractionType.Acknowledged,
        }),
      ).rejects.toThrow('bannerId must be a non-empty string')

      expect(api.sendAPIRequest).not.toHaveBeenCalled()
    })

    it('validates interaction type against BannerInteractionType', async () => {
      const api = mockApi()

      await expect(
        interactWithBanner(api, {
          bannerId: 'banner-123',
          type: 'invalid-interaction' as unknown as BannerInteractionType,
        }),
      ).rejects.toThrow(/Invalid banner interaction type/)

      expect(api.sendAPIRequest).not.toHaveBeenCalled()
    })

    it('throws formatted error on failure (e.g. banner not dismissable)', async () => {
      const api = mockApi(async () =>
        jsonResponse({ error: 'Banner is not dismissable' }, 400, 'Bad Request'),
      )

      await expect(
        interactWithBanner(api, {
          bannerId: 'banner-123',
          type: BannerInteractionType.Dismissed,
        }),
      ).rejects.toThrow('Failed to record banner interaction: Banner is not dismissable')
    })

    it('throws formatted error when banner not found (404)', async () => {
      const api = mockApi(async () =>
        jsonResponse({ error: 'Banner not found' }, 404, 'Not Found'),
      )

      await expect(
        interactWithBanner(api, {
          bannerId: 'non-existent',
          type: BannerInteractionType.Acknowledged,
        }),
      ).rejects.toThrow('Failed to record banner interaction: Banner not found')
    })
  })

  describe('createApiInterface wrappers', () => {
    it('getActiveBanners is bound on the interface', async () => {
      const api = mockApi(async () => jsonResponse([sampleBanner]))
      const client = createApiInterface(api)

      const result = await client.getActiveBanners()
      expect(result).toEqual([sampleBanner])
      expect(api.sendAPIRequest).toHaveBeenCalledWith(
        '/banners/active',
        expect.objectContaining({ method: 'GET' }),
      )
    })

    it('interactWithBanner is bound on the interface', async () => {
      const api = mockApi(async () => noContentResponse(204))
      const client = createApiInterface(api)

      await client.interactWithBanner('banner-123', BannerInteractionType.Acknowledged)
      expect(api.sendAPIRequest).toHaveBeenCalledWith(
        '/banners/banner-123/interact',
        expect.objectContaining({ method: 'POST' }),
        JSON.stringify({ type: 'acknowledged' }),
      )
    })
  })
})
