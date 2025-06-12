import { Readable } from 'stream'
import { withRetries } from './utils'

interface FetchedFile {
  length: number
  encoding: string
  data: Readable
}

export const createAutoFilesApi = (baseUrl: string, apiSecret: string) => {
  const authFetch = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: { ...options.headers, authorization: `Bearer ${apiSecret}` },
    })
  }

  const getChunk = async (cid: string, chunk: number): Promise<ArrayBuffer | null> => {
    const response = await authFetch(`${baseUrl}/files/${cid}/partial?chunk=${chunk}`)
    if (!response.ok) {
      throw new Error('Error fetching chunk')
    }

    if (response.status === 204) {
      return null
    }

    const buffer = await response.arrayBuffer()
    console.log('Chunk download finished:', buffer.byteLength)
    return buffer
  }

  const getFile = async (
    cid: string,
    {
      retriesPerFetch = 3,
      onProgress,
    }: { retriesPerFetch?: number; onProgress?: (progress: number) => void } = {},
  ): Promise<FetchedFile> => {
    const response = await withRetries(
      () => authFetch(`${baseUrl}/files/${cid}/info`),
      retriesPerFetch,
    )
    if (!response.ok) {
      throw new Error('Error fetching file header')
    }

    const length = parseInt(response.headers.get('Content-Length') ?? '0')
    const encoding = response.headers.get('Content-Encoding') ?? 'utf-8'

    let i = 0
    let totalDownloaded = 0
    return {
      data: new Readable({
        async read() {
          const chunk = await withRetries(() => getChunk(cid, i++), retriesPerFetch)
          this.push(chunk ? Buffer.from(chunk) : null)
          totalDownloaded += chunk?.byteLength ?? 0
          onProgress?.(totalDownloaded / length)
        },
      }),
      length,
      encoding,
    }
  }

  return { getFile }
}
