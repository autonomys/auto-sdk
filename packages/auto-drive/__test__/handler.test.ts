import { NetworkId } from '@autonomys/auto-utils'
import { createApiRequestHandler } from '../src/api/handler'
import { ConnectionOptions } from '../src/api/types'
import { version } from '../src/package'

describe('createApiRequestHandler', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })))
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('initializes URLs from Taurus network preset', () => {
    const handler = createApiRequestHandler({
      apiKey: 'test-key',
      network: NetworkId.TAURUS,
    })

    expect(handler.baseUrl).toBe('https://demo.auto-drive.autonomys.xyz/api')
    expect(handler.downloadBaseUrl).toBe('https://public.taurus.auto-drive.autonomys.xyz/api')
  })

  it('initializes URLs from Mainnet network preset', () => {
    const handler = createApiRequestHandler({
      apiKey: 'test-key',
      network: NetworkId.MAINNET,
    })

    expect(handler.baseUrl).toBe('https://mainnet.auto-drive.autonomys.xyz/api')
    expect(handler.downloadBaseUrl).toBe('https://public.auto-drive.autonomys.xyz/api')
  })

  it('initializes custom apiUrl and downloadServiceUrl', () => {
    const handler = createApiRequestHandler({
      apiKey: 'test-key',
      apiUrl: 'https://custom.api.org',
      downloadServiceUrl: 'https://custom.download.org',
    })

    expect(handler.baseUrl).toBe('https://custom.api.org')
    expect(handler.downloadBaseUrl).toBe('https://custom.download.org')
  })

  it('defaults downloadServiceUrl to apiUrl when downloadServiceUrl is omitted', () => {
    const handler = createApiRequestHandler({
      apiKey: 'test-key',
      apiUrl: 'https://custom.api.org',
    })

    expect(handler.baseUrl).toBe('https://custom.api.org')
    expect(handler.downloadBaseUrl).toBe('https://custom.api.org')
  })

  it('throws an error if no base URL is provided at runtime', () => {
    expect(() =>
      createApiRequestHandler({
        apiKey: 'test-key',
      } as unknown as ConnectionOptions),
    ).toThrow('No base URL provided')
  })

  it('throws an error if no download base URL is provided at runtime', () => {
    expect(() =>
      createApiRequestHandler({
        apiKey: 'test-key',
        apiUrl: 'https://api.test',
        downloadServiceUrl: '',
      } as unknown as ConnectionOptions),
    ).toThrow('No download base URL provided')
  })

  it('injects default headers into requests', async () => {
    const handler = createApiRequestHandler({
      apiKey: 'secret-api-key',
      apiUrl: 'https://api.test',
    })

    await handler.sendAPIRequest('/status', { method: 'GET' })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, req] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.test/status')

    const headers = req.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer secret-api-key')
    expect(headers.get('x-auth-provider')).toBe('apikey')
    expect(headers.get('x-auto-sdk-version')).toBe(version)
    expect(headers.get('User-Agent')).toBe(`AutoDrive/${version}`)
  })

  it('safely handles plain object headers without crashing', async () => {
    const handler = createApiRequestHandler({
      apiKey: 'key',
      apiUrl: 'https://api.test',
    })

    await handler.sendAPIRequest(
      '/test',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-custom-header': 'custom-value',
        } as unknown as Headers,
      },
      JSON.stringify({ data: 123 }),
    )

    const [, req] = (global.fetch as jest.Mock).mock.calls[0]
    const headers = req.headers as Headers
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('x-custom-header')).toBe('custom-value')
    expect(headers.get('Authorization')).toBe('Bearer key')
  })

  it('safely handles Headers instance', async () => {
    const handler = createApiRequestHandler({
      apiKey: 'key',
      apiUrl: 'https://api.test',
    })

    const customHeaders = new Headers({
      'Content-Type': 'text/plain',
      'x-from-headers-instance': 'yes',
    })

    await handler.sendAPIRequest('/test', {
      method: 'POST',
      headers: customHeaders,
    })

    const [, req] = (global.fetch as jest.Mock).mock.calls[0]
    const headers = req.headers as Headers
    expect(headers.get('Content-Type')).toBe('text/plain')
    expect(headers.get('x-from-headers-instance')).toBe('yes')
  })

  it('safely handles array of tuple headers', async () => {
    const handler = createApiRequestHandler({
      apiKey: 'key',
      apiUrl: 'https://api.test',
    })

    await handler.sendAPIRequest('/test', {
      method: 'GET',
      headers: [['x-tuple-header', 'tuple-value']] as unknown as Headers,
    })

    const [, req] = (global.fetch as jest.Mock).mock.calls[0]
    const headers = req.headers as Headers
    expect(headers.get('x-tuple-header')).toBe('tuple-value')
  })

  it('normalizes URLs with trailing baseUrl slash and leading relativeUrl slash', async () => {
    const handler = createApiRequestHandler({
      apiKey: 'key',
      apiUrl: 'https://api.test///',
    })

    await handler.sendAPIRequest('/endpoint', { method: 'GET' })

    const [url] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.test/endpoint')
  })

  it('normalizes URLs without leading slash (e.g., @me)', async () => {
    const handler = createApiRequestHandler({
      apiKey: 'key',
      apiUrl: 'https://api.test',
    })

    await handler.sendAPIRequest('@me', { method: 'GET' })

    const [url] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.test/@me')
  })

  it('sends download requests to downloadBaseUrl with normalization', async () => {
    const handler = createApiRequestHandler({
      apiKey: 'key',
      apiUrl: 'https://api.test',
      downloadServiceUrl: 'https://download.test',
    })

    await handler.sendDownloadRequest('downloads/cid123', { method: 'GET' })

    const [url] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://download.test/downloads/cid123')
  })

  it('omits Authorization header when apiKey is null', async () => {
    const handler = createApiRequestHandler({
      apiKey: '',
      apiUrl: 'https://api.test',
    })

    await handler.sendAPIRequest('/public', { method: 'GET' })

    const [, req] = (global.fetch as jest.Mock).mock.calls[0]
    const headers = req.headers as Headers
    expect(headers.get('Authorization')).toBeNull()
  })
})
