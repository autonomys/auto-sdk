import { ArgsWithoutPagination } from '../../utils/types'
import { AsyncDownload, DownloadStatus } from '../models/asyncDownloads'
import { AutoDriveApiHandler } from '../types'

export const downloadObject = async (
  api: AutoDriveApiHandler,
  query: ArgsWithoutPagination<{ cid: string; ignoreBackendEncoding?: boolean }>,
): Promise<ReadableStream<Uint8Array>> => {
  const ignoreBackendEncoding = query.ignoreBackendEncoding ?? true

  const response = await api.sendRequest(
    `/downloads/${query.cid}?ignoreEncoding=${ignoreBackendEncoding}`,
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

export const createAsyncDownload = async (
  api: AutoDriveApiHandler,
  cid: string,
): Promise<AsyncDownload> => {
  const response = await api.sendRequest(`/downloads/async/${cid}`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to create async download: ${response.statusText}`)
  }

  return response.json() as Promise<AsyncDownload>
}

export const getAsyncDownload = async (
  api: AutoDriveApiHandler,
  downloadId: string,
): Promise<AsyncDownload> => {
  const response = await api.sendRequest(`/downloads/async/${downloadId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get async download: ${response.statusText}`)
  }

  return response.json() as Promise<AsyncDownload>
}

export const getAsyncDownloads = async (api: AutoDriveApiHandler): Promise<AsyncDownload[]> => {
  const response = await api.sendRequest('/downloads/async/@me', {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get async downloads: ${response.statusText}`)
  }

  return response.json() as Promise<AsyncDownload[]>
}

export const dismissAsyncDownload = async (
  api: AutoDriveApiHandler,
  downloadId: string,
): Promise<void> => {
  const response = await api.sendRequest(`/downloads/async/${downloadId}/dismiss`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to dismiss async download: ${response.statusText}`)
  }
}
export const publicDownloadUrl = (api: AutoDriveApiHandler, cid: string): string => {
  return `${api.baseUrl}/objects/${cid}/public`
}

export const downloadStatus = async (
  api: AutoDriveApiHandler,
  cid: string,
): Promise<{ status: DownloadStatus }> => {
  const response = await api.sendRequest(`/downloads/async/${cid}/status`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get download status: ${response.statusText}`)
  }

  return response.json() as Promise<{ status: DownloadStatus }>
}
