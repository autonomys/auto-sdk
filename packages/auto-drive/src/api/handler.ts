import { version } from '../package'
import { getDownloadServiceUrl, getNetworkUrl } from './networks'
import { AuthProvider, AutoDriveApiHandler, ConnectionOptions } from './types'

const createSendRequest =
  (baseUrl: string, provider: AuthProvider, apiKey: string) =>
  async (relativeUrl: string, request: Partial<Request>, body?: BodyInit) => {
    const headers = new Headers({
      ...Object.fromEntries(request.headers?.entries() || []),
      'x-auth-provider': provider,
      Authorization: `Bearer ${apiKey}`,
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
  url = null,
  network,
}: ConnectionOptions): AutoDriveApiHandler => {
  const baseUrl = !network ? url : getNetworkUrl(network)
  const downloadBaseUrl = !network ? url : getDownloadServiceUrl(network)
  if (!baseUrl) {
    throw new Error('No base URL provided')
  }
  if (!downloadBaseUrl) {
    throw new Error('No download base URL provided')
  }
  if (!apiKey) {
    throw new Error('No API key provided')
  }

  const api = {
    sendAPIRequest: createSendRequest(baseUrl, provider, apiKey),
    sendDownloadRequest: createSendRequest(downloadBaseUrl, provider, apiKey),
    downloadBaseUrl,
    baseUrl,
  }

  return api
}
