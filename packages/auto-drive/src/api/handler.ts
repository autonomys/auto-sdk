import { version } from '../package'
import { getDownloadServiceUrl, getNetworkUrl } from './networks'
import { AuthProvider, AutoDriveApiHandler, ConnectionOptions } from './types'

const createSendRequest =
  (baseUrl: string, provider: AuthProvider | null, apiKey: string | null) =>
  async (relativeUrl: string, request: Partial<Request>, body?: BodyInit) => {
    const headers = new Headers(request.headers as HeadersInit | undefined)
    if (provider) {
      headers.set('x-auth-provider', provider)
    }
    if (apiKey) {
      headers.set('Authorization', `Bearer ${apiKey}`)
    }
    headers.set('x-auto-sdk-version', version)
    headers.set('User-Agent', `AutoDrive/${version}`)

    const fullRequest = {
      ...request,
      headers,
      body,
    }

    const cleanBaseUrl = baseUrl.replace(/\/+$/, '')
    const normalizedUrl = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`

    return fetch(`${cleanBaseUrl}${normalizedUrl}`, fullRequest)
  }

export const createApiRequestHandler = ({
  provider = 'apikey',
  apiKey,
  apiUrl = null,
  downloadServiceUrl = apiUrl,
  network,
}: ConnectionOptions): AutoDriveApiHandler => {
  const baseUrl = !network ? apiUrl : getNetworkUrl(network)
  const downloadBaseUrl = !network ? downloadServiceUrl : getDownloadServiceUrl(network)
  if (!baseUrl) {
    throw new Error('No base URL provided')
  }
  if (!downloadBaseUrl) {
    throw new Error('No download base URL provided')
  }

  const api = {
    sendAPIRequest: createSendRequest(baseUrl, provider, apiKey),
    sendDownloadRequest: createSendRequest(downloadBaseUrl, provider, apiKey),
    downloadBaseUrl,
    baseUrl,
  }

  return api
}
