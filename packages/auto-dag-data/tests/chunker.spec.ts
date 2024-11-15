import { BaseBlockstore, MemoryBlockstore } from 'blockstore-core'
import { cidOfNode, cidToString } from '../src'
import {
  processFileToIPLDFormat,
  processFolderToIPLDFormat,
  processMetadataToIPLDFormat,
} from '../src/ipld/chunker'
import { createNode, decodeNode, PBNode } from '../src/ipld/utils'
import { IPLDNodeData, MetadataType, OffchainMetadata } from '../src/metadata'

describe('chunker', () => {
  describe('file creation', () => {
    it('create a file dag from a small buffer', async () => {
      const text = 'hello world'
      const size = text.length
      const name = 'test.txt'
      const blockstore = new MemoryBlockstore()

      await processFileToIPLDFormat(
        blockstore,
        bufferToIterable(Buffer.from(text)),
        BigInt(size),
        name,
      )
      const nodes = await nodesFromBlockstore(blockstore)
      expect(nodes.length).toBe(1)

      const node = nodes[0]
      expect(node).toBeDefined()
      expect(node?.Data).toBeDefined()
      const decoded = IPLDNodeData.decode(node?.Data ?? new Uint8Array())
      expect(decoded.data).toBeDefined()

      /// Check the metadata
      expect(decoded.name).toBe(name)
      expect(decoded.type).toBe(MetadataType.File)
      expect(Buffer.from(decoded.data ?? '').toString()).toBe(text)
      expect(decoded.linkDepth).toBe(0)
      expect(decoded.size?.toString()).toBe(text.length.toString())

      /// Check no links
      expect(node?.Links.length).toBe(0)
    })

    it('create a file dag from a large buffer', async () => {
      const maxChunkSize = 1000
      const chunkNum = 10
      const chunk = 'h'.repeat(maxChunkSize)
      const text = chunk.repeat(chunkNum)
      const size = text.length

      const name = 'test.txt'
      /// 1 chunk + root
      const EXPECTED_NODE_COUNT = 2

      const blockstore = new MemoryBlockstore()
      const headCID = await processFileToIPLDFormat(
        blockstore,
        bufferToIterable(Buffer.from(text)),
        BigInt(size),
        name,
        {
          maxChunkSize,
          maxLinkPerNode: maxChunkSize / 64,
        },
      )

      const nodes = await nodesFromBlockstore(blockstore)
      expect(nodes.length).toBe(EXPECTED_NODE_COUNT)

      const head = decodeNode(await blockstore.get(headCID))
      expect(head?.Data).toBeDefined()
      expect(head).toBeDefined()
      expect(head?.Links.length).toBe(chunkNum)

      const decoded = IPLDNodeData.decode(head?.Data ?? new Uint8Array())
      expect(decoded.name).toBe(name)
      expect(decoded.type).toBe(MetadataType.File)
      expect(decoded.linkDepth).toBe(1)
      expect(decoded.size!.toString()).toBe(text.length.toString())

      nodes.forEach((node) => {
        if (cidToString(cidOfNode(node)) !== cidToString(headCID)) {
          expect(node?.Links.length).toBe(0)
        }
      })
    })

    it('create a file dag with inlinks', async () => {
      const maxChunkSize = 1000
      const chunkNum = 10
      const chunk = 'h'.repeat(maxChunkSize)
      const name = 'test.txt'
      const text = chunk.repeat(chunkNum)
      const size = text.length

      /// 1 chunks + 2 inlinks + root
      const EXPECTED_NODE_COUNT = 4

      const blockstore = new MemoryBlockstore()
      const headCID = await processFileToIPLDFormat(
        blockstore,
        bufferToIterable(Buffer.from(text)),
        BigInt(size),
        name,
        {
          maxChunkSize,
          maxLinkPerNode: 4,
        },
      )

      const nodes = await nodesFromBlockstore(blockstore)
      expect(nodes.length).toBe(EXPECTED_NODE_COUNT)

      let [rootCount, inlinkCount, chunkCount] = [0, 0, 0]

      nodes.forEach((node) => {
        const decoded = IPLDNodeData.decode(node?.Data ?? new Uint8Array())
        if (decoded.type === MetadataType.File) {
          rootCount++
        } else if (decoded.type === MetadataType.FileInlink) {
          inlinkCount++
        } else if (decoded.type === MetadataType.FileChunk) {
          chunkCount++
        } else {
          throw new Error('Unexpected node type')
        }
      })

      expect(rootCount).toBe(1)
      expect(inlinkCount).toBe(2)
      expect(chunkCount).toBe(1)
    })
  })

  describe('folder creation', () => {
    it('create a folder dag from a small buffer', async () => {
      const links = Array.from({ length: 1 }, () =>
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
      )
      const name = 'folder'
      const size = 1000
      const blockstore = new MemoryBlockstore()
      const headCID = processFolderToIPLDFormat(blockstore, links, name, BigInt(size), {
        maxLinkPerNode: 4,
      })

      const nodes = await nodesFromBlockstore(blockstore)
      expect(nodes.length).toBe(1)
      const node = nodes[0]
      expect(node).toBeDefined()
      expect(node?.Data).toBeDefined()
      const decoded = IPLDNodeData.decode(node?.Data ?? new Uint8Array())
      expect(decoded.name).toBe(name)
      expect(decoded.type).toBe(MetadataType.Folder)
      expect(decoded.linkDepth).toBe(0)
      expect(decoded.size!.toString()).toBe(size.toString())
    })

    it('create a folder dag with inlinks', async () => {
      const links = Array.from({ length: 10 }, () =>
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
      )
      const name = 'folder'
      const size = 1000

      /// 3 inlinks + root
      const EXPECTED_NODE_COUNT = 4

      const blockstore = new MemoryBlockstore()
      const headCID = processFolderToIPLDFormat(blockstore, links, name, BigInt(size), {
        maxLinkPerNode: 4,
      })

      const nodes = await nodesFromBlockstore(blockstore)
      expect(nodes.length).toBe(EXPECTED_NODE_COUNT)

      let [rootCount, inlinkCount] = [0, 0, 0]

      nodes.forEach((node) => {
        const decoded = IPLDNodeData.decode(node?.Data ?? new Uint8Array())
        if (decoded.type === MetadataType.Folder) {
          rootCount++
        } else if (decoded.type === MetadataType.FolderInlink) {
          inlinkCount++
        } else {
          throw new Error('Unexpected node type')
        }
      })

      expect(rootCount).toBe(1)
      expect(inlinkCount).toBe(3)
    })
  })

  describe('metadata creation', () => {
    it('create a metadata dag from a small buffer', async () => {
      const metadata: OffchainMetadata = {
        type: 'file',
        dataCid: 'test',
        name: 'test',
        mimeType: 'text/plain',
        totalSize: BigInt(1000),
        totalChunks: 10,
        chunks: [],
      }

      const blockstore = new MemoryBlockstore()
      const headCID = await processMetadataToIPLDFormat(blockstore, metadata)
      const nodes = await nodesFromBlockstore(blockstore)
      expect(nodes.length).toBe(1)
    })

    it('large metadata dag represented into multiple nodes', async () => {
      const metadata: OffchainMetadata = {
        type: 'file',
        dataCid: 'test',
        name: 'test',
        mimeType: 'text/plain'.repeat(100),
        totalSize: BigInt(1000),
        totalChunks: 10,
        chunks: [],
      }

      const blockstore = new MemoryBlockstore()
      const headCID = await processMetadataToIPLDFormat(blockstore, metadata, {
        maxChunkSize: 200,
        maxLinkPerNode: 2,
      })
      const nodes = await nodesFromBlockstore(blockstore)
      expect(nodes.length).toBeGreaterThan(1)
    })
  })

  describe('asyncronous chunking equivalence', () => {
    it('chunk a small file buffer', async () => {
      const buffer = Buffer.from('hello world')
      const blockstore = new MemoryBlockstore()
      const chunkedBlockstore = new MemoryBlockstore()
      const singleBufferCID = await processFileToIPLDFormat(
        blockstore,
        bufferToIterable(buffer),
        BigInt(buffer.length),
        'test.txt',
      )
      const chunkedBufferCID = await processFileToIPLDFormat(
        chunkedBlockstore,
        separateBufferToIterable(buffer, 5),
        BigInt(buffer.length),
        'test.txt',
      )

      expect(singleBufferCID).toEqual(chunkedBufferCID)
    })

    it('chunk a large file buffer', async () => {
      const buffer = Buffer.from('hello world')
      const blockstore = new MemoryBlockstore()
      const chunkedBlockstore = new MemoryBlockstore()
      const singleBufferCID = await processFileToIPLDFormat(
        blockstore,
        bufferToIterable(buffer),
        BigInt(buffer.length),
        'test.txt',
      )
      const chunkedBufferCID = await processFileToIPLDFormat(
        chunkedBlockstore,
        separateBufferToIterable(buffer, 5),
        BigInt(buffer.length),
        'test.txt',
      )

      expect(singleBufferCID).toEqual(chunkedBufferCID)
    })
  })
})

const bufferToIterable = (buffer: Buffer): AsyncIterable<Buffer> => {
  return (async function* () {
    yield buffer
  })()
}

const separateBufferToIterable = (buffer: Buffer, chunkSize: number): AsyncIterable<Buffer> => {
  return (async function* () {
    while (buffer.length > 0) {
      yield buffer.subarray(0, chunkSize)
      buffer = buffer.subarray(chunkSize)
    }
  })()
}

const nodesFromBlockstore = async (blockstore: BaseBlockstore): Promise<PBNode[]> => {
  const nodes: PBNode[] = []
  for await (const pair of blockstore.getAll()) {
    nodes.push(decodeNode(pair.block))
  }
  return nodes
}
