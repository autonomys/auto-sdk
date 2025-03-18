import { MemoryBlockstore } from 'blockstore-core'
import {
  createChunkedFileIpldNode,
  createSingleFileIpldNode,
  decodeIPLDNodeData,
  decodeNode,
  DEFAULT_MAX_CHUNK_SIZE,
  encodeNode,
  fileBuilders,
  processBufferToIPLDFormatFromChunks,
  processChunksToIPLDFormat,
  processFileToIPLDFormat,
} from '../src'

describe('file retrievability', () => {
  it('should be able to retrieve a file', () => {
    const filename = 'test.txt'
    const buffer = Buffer.from('hello world')
    const encodedNode = encodeNode(createSingleFileIpldNode(buffer, filename))

    const decodedNode = decodeIPLDNodeData(encodedNode)

    expect(decodedNode.name).toBe(filename)
    expect(decodedNode.size!.toString()).toBe(buffer.length.toString())
    const data = decodedNode.data ? Buffer.from(decodedNode.data) : Buffer.from('')
    expect(data.toString()).toBe(buffer.toString())
  })

  it('should be able to retrieve a file with chunked file', async () => {
    const filename = 'test.txt'
    const expectedChunks = 4
    const fileSize = expectedChunks * DEFAULT_MAX_CHUNK_SIZE
    const buffer = Buffer.from(
      Array.from({ length: fileSize })
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join(''),
    )
    const blockstore = new MemoryBlockstore()
    const headCID = await processFileToIPLDFormat(
      blockstore,
      [buffer],
      BigInt(buffer.length),
      filename,
    )

    const node = await blockstore.get(headCID)
    const decodedNode = decodeNode(node)

    expect(decodedNode.Links.length).toBe(expectedChunks)
    const chunks = await Promise.all(
      decodedNode.Links.map(async (e) => {
        const chunk = await blockstore.get(e.Hash)
        const decodedChunk = decodeIPLDNodeData(chunk)
        expect(decodedChunk.data).toBeDefined()
        return Buffer.from(decodedChunk.data!)
      }),
    )

    const allChunks = await Promise.all(chunks)
    const finalBuffer = Buffer.concat(allChunks)
    expect(finalBuffer.toString()).toBe(buffer.toString())
  })

  it('should be able to retrieve a file with chunked file with uneven chunk size', async () => {
    const filename = 'test.txt'
    const expectedChunks = 1.5
    const fileSize = Math.floor(expectedChunks * DEFAULT_MAX_CHUNK_SIZE)
    const buffer = Buffer.from(
      Array.from({ length: fileSize })
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join(''),
    )

    const blockstore = new MemoryBlockstore()
    const headCID = await processFileToIPLDFormat(
      blockstore,
      [buffer],
      BigInt(buffer.length),
      filename,
    )

    const node = await blockstore.get(headCID)
    const decodedNode = decodeNode(node)

    expect(decodedNode.Links.length).toBe(Math.ceil(expectedChunks))
    const chunks = await Promise.all(
      decodedNode.Links.map(async (e) => {
        const chunk = await blockstore.get(e.Hash)
        const decodedChunk = decodeIPLDNodeData(chunk)
        expect(decodedChunk.data).toBeDefined()
        return Buffer.from(decodedChunk.data!)
      }),
    )

    const allChunks = await Promise.all(chunks)
    const finalBuffer = Buffer.concat(allChunks)
    expect(finalBuffer.toString()).toBe(buffer.toString())
  })

  it('should be able to retrieve a file with chunked file with different chunk size and uneven chunk size ', async () => {
    const filename = 'test.txt'

    const expectedChunks = 2
    const chunkSize = Math.floor((DEFAULT_MAX_CHUNK_SIZE * 100) / 121)
    const fileSize = Math.floor(expectedChunks * chunkSize)
    const buffer = Buffer.from(
      Array.from({ length: fileSize })
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join(''),
    )

    const blockstore = new MemoryBlockstore()
    const headCID = await processFileToIPLDFormat(
      blockstore,
      [buffer],
      BigInt(buffer.length),
      filename,
    )

    const node = await blockstore.get(headCID)
    const decodedNode = decodeNode(node)

    expect(decodedNode.Links.length).toBe(Math.ceil(expectedChunks))
    const chunks = await Promise.all(
      decodedNode.Links.map(async (e) => {
        const chunk = await blockstore.get(e.Hash)
        const decodedChunk = decodeIPLDNodeData(chunk)
        expect(decodedChunk.data).toBeDefined()
        return Buffer.from(decodedChunk.data!)
      }),
    )

    const allChunks = await Promise.all(chunks)
    const finalBuffer = Buffer.concat(allChunks)
    expect(finalBuffer.toString()).toBe(buffer.toString())
  })

  it('should retrieve a file generated asynchronously', async () => {
    const filename = 'test.txt'
    const chunkSize = DEFAULT_MAX_CHUNK_SIZE
    const chunksCount = 50
    const buffer = Buffer.from(
      Array.from({ length: chunkSize * chunksCount })
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join(''),
    )

    const blockstore = new MemoryBlockstore()
    await processChunksToIPLDFormat(blockstore, [buffer], fileBuilders)

    const mapCIDs = (async function* () {
      for await (const { cid } of blockstore.getAll()) {
        yield cid
      }
    })()

    const headCID = await processBufferToIPLDFormatFromChunks(
      blockstore,
      mapCIDs,
      filename,
      BigInt(buffer.length),
      fileBuilders,
    )

    const node = await blockstore.get(headCID)
    const decodedNode = decodeNode(node)

    expect(decodedNode.Links.length).toBe(chunksCount)
    const chunks = await Promise.all(
      decodedNode.Links.map(async (e) => {
        const chunk = await blockstore.get(e.Hash)
        const decodedChunk = decodeIPLDNodeData(chunk)
        expect(decodedChunk.data).toBeDefined()
        return Buffer.from(decodedChunk.data!)
      }),
    )

    const allChunks = await Promise.all(chunks)
    const finalBuffer = Buffer.concat(allChunks)
    expect(finalBuffer.toString()).toBe(buffer.toString())
  })
})
