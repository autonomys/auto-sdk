import { Readable } from 'stream'
import { createAutoFilesApi } from '../src/api'

const BASE_URL = 'https://files.example.invalid'
const CID = 'bafkr6itestcid'
const CHUNKS = ['chunk-0', 'chunk-1', 'chunk-2', 'chunk-3', 'chunk-4', 'chunk-5']

const chunkResponse = (index: number) =>
  index < CHUNKS.length ? new Response(CHUNKS[index]) : new Response(null, { status: 204 })

const serverError = () => new Response('boom', { status: 500, statusText: 'Internal Server Error' })

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

describe('getChunkedFile', () => {
  const api = createAutoFilesApi(BASE_URL, 'test-secret')

  afterEach(() => {
    jest.restoreAllMocks()
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

  it('reports progress against the file size', async () => {
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
