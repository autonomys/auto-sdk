import { version } from '../package'
import { getNetworkUrl } from './networks'
import { AutoDriveApiHandler, ConnectionOptions } from './types'

export const createApiRequestHandler = ({
  provider = 'apikey',
  apiKey,
  url = null,
  network,
}: ConnectionOptions): AutoDriveApiHandler => {
  const baseUrl = !network ? url : getNetworkUrl(network)
  if (!baseUrl) {
    throw new Error('No base URL provided')
  }

  const api = {
    sendRequest: async (relativeUrl: string, request: Partial<Request>, body?: BodyInit) => {
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
    },
    baseUrl,
  }

  return api
}
