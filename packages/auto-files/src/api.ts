import { httpBodyToStream } from '@autonomys/asynchronous'
import { CompressionOptions, EncryptionOptions } from '@autonomys/auto-drive'
import { Readable } from 'stream'
import { withRetries } from './utils'
interface FetchedFile {
  length: bigint
  compression: CompressionOptions | undefined
  encryption: EncryptionOptions | undefined
  data: Readable
}

/**
 * Creates an API client for interacting with the Auto Files service
 * @param baseUrl - The base URL of the Auto Files API
 * @param apiSecret - The API secret key for authentication
 * @returns An object containing methods to interact with the API
 */
export const createAutoFilesApi = (baseUrl: string, apiSecret: string) => {
  /**
   * Makes an authenticated fetch request to the API
   * @param url - The URL to fetch from
   * @param options - Optional fetch request options
   * @returns A Promise that resolves to the fetch Response
   */
  const authFetch = (url: string, options: RequestInit = {}) => {
    const urlObj = new URL(url)
    return fetch(urlObj.toString(), {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${apiSecret}` },
    })
  }

  /**
   * Fetches a specific chunk of a file from the API
   * @param cid - The content identifier of the file
   * @param chunk - The chunk number to fetch
   * @returns A Promise that resolves to the chunk data as ArrayBuffer, or null if chunk doesn't exist
   * @throws Error if the chunk fetch fails
   */
  const getChunk = async (cid: string, chunk: number): Promise<ArrayBuffer | null> => {
    const response = await authFetch(`${baseUrl}/files/${cid}/partial?chunk=${chunk}`)
    if (!response.ok) {
      throw new Error(`Error fetching chunk: ${response.status} ${response.statusText}`)
    }

    if (response.status === 204) {
      return null
    }

    const buffer = await response.arrayBuffer()
    return buffer
  }

  /**
   * Fetches a specific node from the API
   * @param cid - The CID of the node
   * @returns A Promise that resolves to the node data as ArrayBuffer
   * @throws Error if the node fetch fails
   */
  const getNode = async (cid: string): Promise<ArrayBuffer> => {
    const response = await authFetch(`${baseUrl}/nodes/${cid}`)
    if (!response.ok) {
      throw new Error(`Error fetching chunk: ${response.status} ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    return buffer
  }

  /**
   * Fetches a complete file from the API with support for progress tracking and retries
   * @param cid - The content identifier of the file to fetch
   * @param options - Optional configuration for the fetch operation
   * @param options.retriesPerFetch - Number of retry attempts for failed requests (default: 3)
   * @param options.onProgress - Optional callback function to track download progress (0-1)
   * @returns A Promise that resolves to a FetchedFile object containing the file data and metadata
   * @throws Error if the file metadata fetch fails
   */
  const getChunkedFile = async (
    cid: string,
    {
      retriesPerFetch = 3,
      onProgress,
    }: { retriesPerFetch?: number; onProgress?: (progress: number) => void } = {},
  ): Promise<FetchedFile> => {
    const response = await withRetries(() => authFetch(`${baseUrl}/files/${cid}/metadata`), {
      retries: retriesPerFetch,
      onRetry: (error, pendingRetries) => {
        console.error(`Error fetching file header, pending retries: ${pendingRetries}`, error)
      },
    })
    if (!response.ok) {
      throw new Error(`Error fetching file header: ${response.status} ${response.statusText}`)
    }

    const metadata = await response.json()

    // Parse size from string to bigint
    const length = BigInt(metadata.size ?? 0)

    const compression = metadata.uploadOptions?.compression
    const encryption = metadata.uploadOptions?.encryption

    let i = 0
    let totalDownloaded = BigInt(0)
    const precision = 10 ** 4
    return {
      data: new Readable({
        async read() {
          const chunk = await withRetries(() => getChunk(cid, i++), {
            retries: retriesPerFetch,
          })
          this.push(chunk ? Buffer.from(chunk) : null)
          totalDownloaded += BigInt(chunk?.byteLength ?? 0)
          onProgress?.(Number((BigInt(precision) * totalDownloaded) / length) / precision)
        },
      }),
      length,
      compression,
      encryption,
    }
  }

  /**
   * Checks if a file is cached on the gateway
   * @param cid - The content identifier of the file
   * @returns A Promise that resolves to true if the file is cached, false otherwise
   * @throws Error if the file status check fails
   */
  const isFileCached = async (cid: string) => {
    const response = await authFetch(`${baseUrl}/files/${cid}/status`)
    if (!response.ok) {
      throw new Error(`Error checking file status: ${response.status} ${response.statusText}`)
    }

    const status = await response.json()

    return status.isCached
  }

  const getFileFromCache = async (
    cid: string,
    options: { raw?: boolean } = {},
  ): Promise<Readable> => {
    const raw = options.raw ?? false
    const response = await authFetch(`${baseUrl}/files/${cid}?raw=${raw}`)
    if (!response.ok) {
      throw new Error(`Error fetching file from cache: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No body in response')
    }

    return httpBodyToStream(response.body)
  }

  /**
   * Fetches a complete file from the API with support for progress tracking and retries
   * @param cid - The content identifier of the file to fetch
   * @returns A Promise that resolves to a FetchedFile object containing the file data and metadata
   * @throws Error if the file metadata fetch fails
   */
  const getFile = async (
    cid: string,
    {
      retriesPerFetch = 3,
      onProgress,
      ignoreCache = false,
    }: {
      retriesPerFetch?: number
      onProgress?: (progress: number) => void
      ignoreCache?: boolean
    } = {},
  ) => {
    if (!ignoreCache && (await isFileCached(cid))) {
      return getFileFromCache(cid, { raw: true })
    }

    const file = await getChunkedFile(cid, {
      retriesPerFetch,
      onProgress,
    })
    return file.data
  }

  return { getFile, isFileCached, getChunkedFile, getNode }
}
