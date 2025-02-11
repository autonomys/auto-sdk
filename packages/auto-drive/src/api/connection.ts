import { NetworkId } from '@autonomys/auto-utils'
import { AutoDriveNetwork, getNetworkUrl, networks } from './networks'

export interface AutoDriveApi {
  sendRequest: (
    relativeUrl: string,
    request: Partial<Request>,
    body?: BodyInit,
  ) => Promise<Response>
  baseUrl: string
}

export enum OAuthProvider {
  GOOGLE = 'google',
  DISCORD = 'discord',
}

export type ApiKeyAuthProvider = 'apikey'
export type AuthProvider = ApiKeyAuthProvider | 'oauth'

type ConnectionOptions =
  | {
      provider?: AuthProvider
      apiKey?: string
      url?: null
      network: AutoDriveNetwork
    }
  | {
      provider?: AuthProvider
      apiKey?: string
      url: string
      network?: null
    }

export const createAutoDriveApi = ({
  provider = 'apikey',
  apiKey,
  url = null,
  network,
}: ConnectionOptions): AutoDriveApi => {
  const baseUrl = !network ? url : getNetworkUrl(network)
  if (!baseUrl) {
    throw new Error('No base URL provided')
  }

  return {
    sendRequest: async (relativeUrl: string, request: Partial<Request>, body?: BodyInit) => {
      const headers = new Headers({
        ...Object.fromEntries(request.headers?.entries() || []),
        'x-auth-provider': provider,
        Authorization: `Bearer ${apiKey}`,
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
}
