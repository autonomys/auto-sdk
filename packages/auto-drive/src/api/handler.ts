import { version } from '../package'
import { getDownloadServiceUrl, getNetworkUrl } from './networks'
import { AuthProvider, AutoDriveApiHandler, ConnectionOptions } from './types'

const createSendRequest =
  (baseUrl: string, provider: AuthProvider | null, apiKey: string | null) =>
  async (relativeUrl: string, request: Partial<Request>, body?: BodyInit) => {
    const headers = new Headers({
      ...Object.fromEntries(request.headers?.entries() || []),
      ...(provider ? { 'x-auth-provider': provider } : {}),
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      'x-auto-sdk-version': version,
      'User-Agent': `AutoDrive/${version}`,
    })
    const fullRequest = {
      ...request,
      headers: new Headers(headers),
      body,
    }

    return fetch(`${baseUrl}${relativeUrl}`, fullRequest)
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
