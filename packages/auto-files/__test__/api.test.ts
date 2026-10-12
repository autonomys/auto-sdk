import { Readable } from 'stream'
import { createAutoFilesApi } from '../src/api'

const BASE_URL = 'https://files.example.invalid'
const CID = 'bafkr6itestcid'
const CHUNKS = ['chunk-0', 'chunk-1', 'chunk-2', 'chunk-3', 'chunk-4', 'chunk-5']

const chunkResponse = (index: number) =>
  index < CHUNKS.length ? new Response(CHUNKS[index]) : new Response(null, { status: 204 })

const serverError = () =>
  new Response('boom', { status: 500, statusText: 'Internal Server Error' })

const mockGateway = (
  getChunk: (index: number) => Response,
  metadata: object = { size: String(CHUNKS.join('').length) },
) => {
  const requestedChunks: number[] = []
  jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input))
    if (url.pathname === `/files/${CID}/metadata`) {
      return new Response(JSON.stringify(metadata))
    }
    if (url.pathname === `/files/${CID}/partial`) {
      const index = Number(url.searchParams.get('chunk'))
      requestedChunks.push(index)
      return getChunk(index)
    }
    throw new Error(`Unexpected request: ${url}`)
  })
  return { requestedChunks }
}

const readAll = async (stream: Readable) => {
  const parts: Buffer[] = []
  for await (const part of stream) {
    parts.push(part)
  }
  return Buffer.concat(parts).toString()
}

describe('createAutoFilesApi validation', () => {
  it('throws when baseUrl is empty or whitespace', () => {
    expect(() => createAutoFilesApi('', 'secret')).toThrow('baseUrl must be a non-empty string')
    expect(() => createAutoFilesApi('   ', 'secret')).toThrow('baseUrl must be a non-empty string')
  })

  it('throws when apiSecret is empty or whitespace', () => {
    expect(() => createAutoFilesApi('https://api.example.com', '')).toThrow(
      'apiSecret must be a non-empty string',
    )
    expect(() => createAutoFilesApi('https://api.example.com', '   ')).toThrow(
      'apiSecret must be a non-empty string',
    )
  })

  it('strips trailing slashes from baseUrl for clean request paths', async () => {
    const api = createAutoFilesApi('https://api.example.com///', 'secret')
    let capturedUrl = ''
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      capturedUrl = String(input)
      return new Response(JSON.stringify({ isCached: true }), { status: 200 })
    })

    const cached = await api.isFileCached('test-cid')
    expect(cached).toBe(true)
    expect(capturedUrl).toBe('https://api.example.com/files/test-cid/status')
  })
})

describe('getChunk and getNode', () => {
  const api = createAutoFilesApi(BASE_URL, 'test-secret')

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('validates cid and chunk index in getChunk', async () => {
    await expect(api.getChunk('', 0)).rejects.toThrow('cid must be a non-empty string')
    await expect(api.getChunk('   ', 0)).rejects.toThrow('cid must be a non-empty string')
    await expect(api.getChunk(CID, -1)).rejects.toThrow('chunk must be a non-negative integer')
    await expect(api.getChunk(CID, 1.5)).rejects.toThrow('chunk must be a non-negative integer')
    await expect(api.getChunk(CID, NaN)).rejects.toThrow('chunk must be a non-negative integer')
  })

  it('fetches chunk successfully and handles 204 null chunk', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))
      if (url.searchParams.get('chunk') === '0') {
        return new Response('chunk0data', { status: 200 })
      }
      return new Response(null, { status: 204 })
    })

    const chunk0 = await api.getChunk(CID, 0)
    expect(chunk0).toBeInstanceOf(ArrayBuffer)
    expect(Buffer.from(chunk0!).toString()).toBe('chunk0data')

    const chunk1 = await api.getChunk(CID, 1)
    expect(chunk1).toBeNull()
  })

  it('throws when getChunk fails with HTTP error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(serverError())
    await expect(api.getChunk(CID, 0)).rejects.toThrow(
      'Error fetching chunk: 500 Internal Server Error',
    )
  })

  it('validates cid in getNode', async () => {
    await expect(api.getNode('')).rejects.toThrow('cid must be a non-empty string')
  })

  it('fetches node successfully', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('nodedata', { status: 200 }))

    const node = await api.getNode('node-cid')
    expect(node).toBeInstanceOf(ArrayBuffer)
    expect(Buffer.from(node).toString()).toBe('nodedata')
  })

  it('throws with correct node error message when getNode fails', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('not found', { status: 404, statusText: 'Not Found' }))

    await expect(api.getNode('node-cid')).rejects.toThrow(
      'Error fetching node: 404 Not Found',
    )
  })
})

describe('getChunkedFile', () => {
  const api = createAutoFilesApi(BASE_URL, 'test-secret')

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('validates cid in getChunkedFile', async () => {
    await expect(api.getChunkedFile('')).rejects.toThrow('cid must be a non-empty string')
  })

  it('retries a transiently failing chunk without skipping it', async () => {
    let chunk3Failures = 0
    const { requestedChunks } = mockGateway((index) =>
      index === 3 && chunk3Failures++ === 0 ? serverError() : chunkResponse(index),
    )

    const file = await api.getChunkedFile(CID, { retriesPerFetch: 1 })

    await expect(readAll(file.data)).resolves.toBe(CHUNKS.join(''))
    expect(requestedChunks).toEqual([0, 1, 2, 3, 3, 4, 5, 6])
  })

  it.each([0, 1])(
    'emits a stream error when a chunk keeps failing (retriesPerFetch: %i)',
    async (retriesPerFetch) => {
      const { requestedChunks } = mockGateway((index) =>
        index >= 2 ? serverError() : chunkResponse(index),
      )

      const file = await api.getChunkedFile(CID, { retriesPerFetch })

      await expect(readAll(file.data)).rejects.toThrow(
        'Error fetching chunk: 500 Internal Server Error',
      )
      expect(requestedChunks).toEqual([0, 1, ...Array(retriesPerFetch + 1).fill(2)])
    },
  )

  it('rejects after retriesPerFetch + 1 failed metadata fetches', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'))

    await expect(api.getChunkedFile(CID, { retriesPerFetch: 1 })).rejects.toThrow('fetch failed')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reports progress against the file size and clamps it between 0 and 1', async () => {
    mockGateway(chunkResponse)
    const onProgress = jest.fn()

    const file = await api.getChunkedFile(CID, { onProgress })
    await readAll(file.data)

    expect(onProgress.mock.calls.map(([progress]) => progress)).toEqual([
      0.1666, 0.3333, 0.5, 0.6666, 0.8333, 1, 1,
    ])
  })

  it('downloads an empty file while reporting progress', async () => {
    mockGateway(() => new Response(null, { status: 204 }), { size: '0' })
    const onProgress = jest.fn()

    const file = await api.getChunkedFile(CID, { onProgress })

    await expect(readAll(file.data)).resolves.toBe('')
    expect(onProgress.mock.calls).toEqual([[1]])
  })

  it('downloads a file whose metadata has no size while reporting progress', async () => {
    mockGateway(chunkResponse, {})
    const onProgress = jest.fn()

    const file = await api.getChunkedFile(CID, { onProgress })

    await expect(readAll(file.data)).resolves.toBe(CHUNKS.join(''))
    expect(onProgress.mock.calls).toEqual([[1]])
  })
})

describe('cache and getFile operations', () => {
  const api = createAutoFilesApi(BASE_URL, 'test-secret')

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('checks if file is cached and returns boolean', async () => {
    await expect(api.isFileCached('')).rejects.toThrow('cid must be a non-empty string')

    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))
      if (url.pathname === '/files/cached-cid/status') {
        return new Response(JSON.stringify({ isCached: true }), { status: 200 })
      }
      if (url.pathname === '/files/uncached-cid/status') {
        return new Response(JSON.stringify({ isCached: false }), { status: 200 })
      }
      return serverError()
    })

    expect(await api.isFileCached('cached-cid')).toBe(true)
    expect(await api.isFileCached('uncached-cid')).toBe(false)
    await expect(api.isFileCached('err-cid')).rejects.toThrow('Error checking file status: 500')
  })

  it('fetches file from cache directly', async () => {
    await expect(api.getFileFromCache('')).rejects.toThrow('cid must be a non-empty string')

    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))
      if (url.pathname === '/files/cached-cid') {
        expect(url.searchParams.get('raw')).toBe('true')
        return new Response('cached-body-data', { status: 200 })
      }
      return serverError()
    })

    const stream = await api.getFileFromCache('cached-cid', { raw: true })
    const result = await readAll(stream)
    expect(result).toBe('cached-body-data')
  })

  it('getFile routes to cache when cached and ignoreCache is false', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))
      if (url.pathname === '/files/my-cid/status') {
        return new Response(JSON.stringify({ isCached: true }), { status: 200 })
      }
      if (url.pathname === '/files/my-cid') {
        return new Response('streamed-from-cache', { status: 200 })
      }
      return serverError()
    })

    const stream = await api.getFile('my-cid')
    expect(await readAll(stream)).toBe('streamed-from-cache')
  })

  it('getFile falls back to chunked fetch when ignoreCache is true', async () => {
    mockGateway(chunkResponse)

    const stream = await api.getFile(CID, { ignoreCache: true })
    expect(await readAll(stream)).toBe(CHUNKS.join(''))
  })
})

describe('moderation operations', () => {
  const api = createAutoFilesApi(BASE_URL, 'test-secret')

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('validates cid in banFile, unbanFile, and isFileBanned', async () => {
    await expect(api.banFile('')).rejects.toThrow('cid must be a non-empty string')
    await expect(api.unbanFile('')).rejects.toThrow('cid must be a non-empty string')
    await expect(api.isFileBanned('')).rejects.toThrow('cid must be a non-empty string')
  })

  it('bans and unbans file successfully', async () => {
    let lastMethod = ''
    let lastUrl = ''
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      lastUrl = String(input)
      lastMethod = init?.method ?? 'GET'
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    })

    await api.banFile('bad-cid')
    expect(lastUrl).toBe(`${BASE_URL}/moderation/bad-cid/ban`)
    expect(lastMethod).toBe('POST')

    await api.unbanFile('bad-cid')
    expect(lastUrl).toBe(`${BASE_URL}/moderation/bad-cid/unban`)
    expect(lastMethod).toBe('POST')
  })

  it('handles moderation failures with informative error messages', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ success: false, message: 'Permission denied' }), { status: 200 }),
    )

    await expect(api.banFile('cid-1')).rejects.toThrow('Failed to ban file: Permission denied')
    await expect(api.unbanFile('cid-1')).rejects.toThrow('Failed to unban file: Permission denied')
  })

  it('fetches banned files list with sanitized pagination', async () => {
    let capturedUrl = ''
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      capturedUrl = String(input)
      return new Response(JSON.stringify({ bannedFiles: ['cid-1', 'cid-2'] }), { status: 200 })
    })

    const files = await api.getBannedFiles(2, 20)
    expect(files).toEqual(['cid-1', 'cid-2'])
    expect(capturedUrl).toBe(`${BASE_URL}/moderation/banned?page=2&limit=20`)

    // Verify negative values fallback to default 1 and 10
    await api.getBannedFiles(-3, -10)
    expect(capturedUrl).toBe(`${BASE_URL}/moderation/banned?page=1&limit=10`)
  })

  it('checks if file is banned', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))
      if (url.pathname === '/moderation/banned-cid/status') {
        return new Response(JSON.stringify({ isBanned: true }), { status: 200 })
      }
      return new Response(JSON.stringify({ isBanned: false }), { status: 200 })
    })

    expect(await api.isFileBanned('banned-cid')).toBe(true)
    expect(await api.isFileBanned('clean-cid')).toBe(false)
  })
})
