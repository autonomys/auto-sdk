import { downloadStatus } from '../src/api/calls/download'
import { DownloadStatus } from '../src/api/models/asyncDownloads'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

describe('isFileCached', () => {
  const cid = 'bafkr6itest'

  // The download server only has GET /downloads/:cid/status; any other path is a 404
  const createHandler = (status: DownloadStatus) => {
    const sendDownloadRequest = jest.fn(async (relativeUrl: string) =>
      relativeUrl === `/downloads/${cid}/status`
        ? new Response(JSON.stringify({ status }), { status: 200 })
        : new Response(`Cannot GET ${relativeUrl}`, { status: 404 }),
    )
    const handler: AutoDriveApiHandler = {
      sendAPIRequest: jest.fn(),
      sendDownloadRequest,
      baseUrl: 'https://example.com/api',
      downloadBaseUrl: 'https://example.com/downloads',
    }
    return { handler, sendDownloadRequest }
  }

  it('should call the download status route of the server', async () => {
    const { handler, sendDownloadRequest } = createHandler(DownloadStatus.Cached)

    await expect(downloadStatus(handler, cid)).resolves.toEqual({ status: DownloadStatus.Cached })
    expect(sendDownloadRequest).toHaveBeenCalledWith(`/downloads/${cid}/status`, { method: 'GET' })
  })

  it('should return true when the file is cached', async () => {
    const { handler } = createHandler(DownloadStatus.Cached)

    await expect(createApiInterface(handler).isFileCached(cid)).resolves.toBe(true)
  })

  it('should return false when the file is not cached', async () => {
    const { handler } = createHandler(DownloadStatus.NotCached)

    await expect(createApiInterface(handler).isFileCached(cid)).resolves.toBe(false)
  })
})
