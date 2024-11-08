export interface AutoDriveApi {
  sendRequest: (
    relativeUrl: string,
    request: Partial<Request>,
    body?: BodyInit,
  ) => Promise<Response>
}

export enum OAuthProvider {
  GOOGLE = 'google',
  DISCORD = 'discord',
}

export type ApiKeyAuthProvider = 'apikey'
export type AuthProvider = ApiKeyAuthProvider | 'oauth'

export const createAutoDriveApi = ({
  provider = 'apikey',
  apiKey,
  url = 'https://demo.auto-drive.autonomys.xyz',
}: {
  provider: AuthProvider
  apiKey: string
  url?: string
}): AutoDriveApi => {
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

      return fetch(`${url}${relativeUrl}`, fullRequest)
    },
  }
}
