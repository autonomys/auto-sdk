export enum AsyncDownloadStatus {
  Pending = 'pending',
  Downloading = 'downloading',
  Completed = 'completed',
  Failed = 'failed',
  Dismissed = 'dismissed',
}

export interface AsyncDownload {
  id: string
  oauthProvider: string
  oauthUserId: string
  cid: string
  status: AsyncDownloadStatus
  errorMessage?: string | null | undefined
  fileSize?: string | null | undefined
  downloadedBytes?: string | null | undefined
  createdAt: Date
  updatedAt: Date
}

export enum DownloadStatus {
  Cached = 'cached',
  NotCached = 'not-cached',
}
