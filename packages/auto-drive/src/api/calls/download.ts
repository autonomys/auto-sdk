import { ArgsWithoutPagination } from '../../utils/types.ts'
import { AutoDriveApi } from '../connection.ts'

export const downloadObject = async (
  api: AutoDriveApi,
  query: ArgsWithoutPagination<{ cid: string }>,
): Promise<ReadableStream<Uint8Array>> => {
  const response = await api.sendRequest(`/objects/${query.cid}/download`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('No body returned from download request')
  }

  return response.body
}
