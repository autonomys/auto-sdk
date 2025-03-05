import { ArgsWithoutPagination } from '../../utils/types'
import { AutoDriveApiHandler } from '../types'

export const downloadObject = async (
  api: AutoDriveApiHandler,
  query: ArgsWithoutPagination<{ cid: string; ignoreBackendEncoding?: boolean }>,
): Promise<ReadableStream<Uint8Array>> => {
  const ignoreBackendEncoding = query.ignoreBackendEncoding ?? true

  const response = await api.sendRequest(
    `/objects/${query.cid}/download?ignoreEncoding=${ignoreBackendEncoding}`,
    {
      method: 'GET',
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('No body returned from download request')
  }

  return response.body
}

export const publicDownloadUrl = (api: AutoDriveApiHandler, cid: string): string => {
  return `${api.baseUrl}/objects/${cid}/public`
}
