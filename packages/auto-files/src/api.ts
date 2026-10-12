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
  if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
    throw new Error('baseUrl must be a non-empty string')
  }
  if (typeof apiSecret !== 'string' || apiSecret.trim().length === 0) {
    throw new Error('apiSecret must be a non-empty string')
  }

  const sanitizedBaseUrl = baseUrl.trim().replace(/\/+$/, '')
  const sanitizedApiSecret = apiSecret.trim()

  const assertCid = (cid: string): string => {
    if (typeof cid !== 'string' || cid.trim().length === 0) {
      throw new Error('cid must be a non-empty string')
    }
    return cid.trim()
  }

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
      headers: { ...options.headers, Authorization: `Bearer ${sanitizedApiSecret}` },
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
    const validCid = assertCid(cid)
    if (typeof chunk !== 'number' || !Number.isFinite(chunk) || chunk < 0 || !Number.isInteger(chunk)) {
      throw new Error('chunk must be a non-negative integer')
    }

    const response = await authFetch(`${sanitizedBaseUrl}/files/${validCid}/partial?chunk=${chunk}`)
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
    const validCid = assertCid(cid)
    const response = await authFetch(`${sanitizedBaseUrl}/nodes/${validCid}`)
    if (!response.ok) {
      throw new Error(`Error fetching node: ${response.status} ${response.statusText}`)
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
    const validCid = assertCid(cid)
    const response = await withRetries(() => authFetch(`${sanitizedBaseUrl}/files/${validCid}/metadata`), {
      retries: retriesPerFetch,
      onRetry: (error, pendingRetries) => {
        console.error(`Error fetching file header, pending retries: ${pendingRetries}`, error)
      },
    })
    if (!response.ok) {
      throw new Error(`Error fetching file header: ${response.status} ${response.statusText}`)
    }

    const metadata = await response.json()

    // Parse size safely from string or number to bigint
    const rawSize = metadata?.size
    let length = BigInt(0)
    if (typeof rawSize === 'bigint') {
      length = rawSize >= BigInt(0) ? rawSize : BigInt(0)
    } else if (typeof rawSize === 'number') {
      length = Number.isFinite(rawSize) && rawSize >= 0 ? BigInt(Math.floor(rawSize)) : BigInt(0)
    } else if (typeof rawSize === 'string' && rawSize.trim().length > 0) {
      try {
        const integerPart = rawSize.trim().split('.')[0]
        const parsed = BigInt(integerPart)
        length = parsed >= BigInt(0) ? parsed : BigInt(0)
      } catch {
        length = BigInt(0)
      }
    }

    const compression = metadata?.uploadOptions?.compression
    const encryption = metadata?.uploadOptions?.encryption

    let i = 0
    let totalDownloaded = BigInt(0)
    const precision = 10 ** 4
    return {
      data: new Readable({
        async read() {
          try {
            const index = i++
            const chunk = await withRetries(() => getChunk(validCid, index), {
              retries: retriesPerFetch,
            })
            this.push(chunk ? Buffer.from(chunk) : null)
            totalDownloaded += BigInt(chunk?.byteLength ?? 0)
            // A zero length (empty file or missing size) gives nothing to measure against
            if (length > BigInt(0)) {
              const rawProgress = Number((BigInt(precision) * totalDownloaded) / length) / precision
              onProgress?.(Math.min(1, Math.max(0, rawProgress)))
            } else if (!chunk) {
              onProgress?.(1)
            }
          } catch (error) {
            this.destroy(error instanceof Error ? error : new Error(String(error)))
          }
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
  const isFileCached = async (cid: string): Promise<boolean> => {
    const validCid = assertCid(cid)
    const response = await authFetch(`${sanitizedBaseUrl}/files/${validCid}/status`)
    if (!response.ok) {
      throw new Error(`Error checking file status: ${response.status} ${response.statusText}`)
    }

    const status = await response.json()

    return Boolean(status?.isCached)
  }

  const getFileFromCache = async (
    cid: string,
    options: { raw?: boolean } = {},
  ): Promise<Readable> => {
    const validCid = assertCid(cid)
    const raw = options.raw ?? false
    const response = await authFetch(`${sanitizedBaseUrl}/files/${validCid}?raw=${raw}`)
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
  ): Promise<Readable> => {
    const validCid = assertCid(cid)
    if (!ignoreCache && (await isFileCached(validCid))) {
      return getFileFromCache(validCid, { raw: true })
    }

    const file = await getChunkedFile(validCid, {
      retriesPerFetch,
      onProgress,
    })
    return file.data
  }

  /**
   * Bans a file by sending a request to the moderation service
   * @param cid - The content identifier of the file to ban
   * @returns A Promise that resolves when the file has been successfully banned
   * @throws Error if the ban operation fails
   */
  const banFile = async (cid: string): Promise<void> => {
    const validCid = assertCid(cid)
    const response = await authFetch(`${sanitizedBaseUrl}/moderation/${validCid}/ban`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Error banning file: ${response.status} ${response.statusText}`)
    }

    const result = await response.json().catch(() => ({}))
    if (result && result.success === false) {
      throw new Error(`Failed to ban file: ${result.message || 'Unknown error'}`)
    }
  }

  /**
   * Unbans a file by sending a request to the moderation service
   * @param cid - The content identifier of the file to unban
   * @returns A Promise that resolves when the file has been successfully unbanned
   * @throws Error if the unban operation fails
   */
  const unbanFile = async (cid: string): Promise<void> => {
    const validCid = assertCid(cid)
    const response = await authFetch(`${sanitizedBaseUrl}/moderation/${validCid}/unban`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Error unbanning file: ${response.status} ${response.statusText}`)
    }

    const result = await response.json().catch(() => ({}))
    if (result && result.success === false) {
      throw new Error(`Failed to unban file: ${result.message || 'Unknown error'}`)
    }
  }

  /**
   * Gets a list of banned files with pagination support
   * @param page - The page number for pagination (optional, defaults to 1)
   * @param limit - The number of files per page (optional, defaults to 10)
   * @returns A Promise that resolves to an array of CIDs
   * @throws Error if the request fails
   */
  const getBannedFiles = async (page: number = 1, limit: number = 10): Promise<string[]> => {
    const validPage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1
    const validLimit = Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : 10
    const response = await authFetch(
      `${sanitizedBaseUrl}/moderation/banned?page=${validPage}&limit=${validLimit}`,
    )

    if (!response.ok) {
      throw new Error(`Error fetching banned files: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    return Array.isArray(result?.bannedFiles) ? result.bannedFiles : []
  }

  /**
   * Checks if a file is banned by querying the moderation service
   * @param cid - The content identifier of the file to check
   * @returns A Promise that resolves to true if the file is banned, false otherwise
   * @throws Error if the status check fails
   */
  const isFileBanned = async (cid: string): Promise<boolean> => {
    const validCid = assertCid(cid)
    const response = await authFetch(`${sanitizedBaseUrl}/moderation/${validCid}/status`)

    if (!response.ok) {
      throw new Error(`Error checking file ban status: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    return Boolean(result?.isBanned)
  }

  return {
    getFile,
    isFileCached,
    getFileFromCache,
    getChunkedFile,
    getNode,
    getChunk,
    banFile,
    unbanFile,
    getBannedFiles,
    isFileBanned,
  }
}
