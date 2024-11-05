export interface AutoDriveApi {
  sendRequest: (
    relativeUrl: string,
    request: Partial<Request>,
    body?: BodyInit,
  ) => Promise<Response>
}

export const createAutoDriveApi = ({
  apiKey,
  url = 'https://demo.auto-drive.autonomys.xyz',
}: {
  apiKey: string
  url?: string
}): AutoDriveApi => {
  return {
    sendRequest: async (relativeUrl: string, request: Partial<Request>, body?: BodyInit) => {
      const headers = new Headers({
        ...Object.fromEntries(request.headers?.entries() || []),
        'x-auth-provider': 'apikey',
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
