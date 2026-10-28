import { ArgsWithoutPagination } from '../../utils/types'
import { AsyncDownload, DownloadStatus } from '../models/asyncDownloads'
import { AutoDriveApiHandler } from '../types'
import { toApiError } from './errors'

export const downloadObject = async (
  api: AutoDriveApiHandler,
  query: ArgsWithoutPagination<{ cid: string; ignoreBackendEncoding?: boolean }>,
): Promise<ReadableStream<Uint8Array>> => {
  const ignoreBackendEncoding = query.ignoreBackendEncoding ?? true

  const response = await api.sendDownloadRequest(
    `/downloads/${query.cid}?ignoreEncoding=${ignoreBackendEncoding}`,
    {
      method: 'GET',
    },
  )

  if (!response.ok) {
    throw await toApiError(response, 'Failed to download file')
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
  const response = await api.sendDownloadRequest(`/downloads/async/${cid}`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw await toApiError(response, 'Failed to create async download')
  }

  return response.json() as Promise<AsyncDownload>
}

export const getAsyncDownload = async (
  api: AutoDriveApiHandler,
  downloadId: string,
): Promise<AsyncDownload> => {
  const response = await api.sendDownloadRequest(`/downloads/async/${downloadId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw await toApiError(response, 'Failed to get async download')
  }

  return response.json() as Promise<AsyncDownload>
}

export const getAsyncDownloads = async (api: AutoDriveApiHandler): Promise<AsyncDownload[]> => {
  const response = await api.sendDownloadRequest('/downloads/async/@me', {
    method: 'GET',
  })

  if (!response.ok) {
    throw await toApiError(response, 'Failed to get async downloads')
  }

  return response.json() as Promise<AsyncDownload[]>
}

export const dismissAsyncDownload = async (
  api: AutoDriveApiHandler,
  downloadId: string,
): Promise<void> => {
  const response = await api.sendDownloadRequest(`/downloads/async/${downloadId}/dismiss`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw await toApiError(response, 'Failed to dismiss async download')
  }
}
export const publicDownloadUrl = (api: AutoDriveApiHandler, cid: string): string => {
  return `${api.downloadBaseUrl}/objects/${cid}/public`
}

export const downloadStatus = async (
  api: AutoDriveApiHandler,
  cid: string,
): Promise<{ status: DownloadStatus }> => {
  const response = await api.sendDownloadRequest(`/downloads/async/${cid}/status`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw await toApiError(response, 'Failed to get download status')
  }

  return response.json() as Promise<{ status: DownloadStatus }>
}
