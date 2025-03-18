import { BaseBlockstore, MemoryBlockstore } from 'blockstore-core'
import {
  cidOfNode,
  cidToString,
  createFileChunkIpldNode,
  createSingleFileIpldNode,
  fileBuilders,
} from '../src'
import {
  DEFAULT_MAX_CHUNK_SIZE,
  LINK_SIZE_IN_BYTES,
  MAX_NAME_SIZE,
  NODE_METADATA_SIZE,
  processBufferToIPLDFormatFromChunks,
  processChunksToIPLDFormat,
  processFileToIPLDFormat,
  processFolderToIPLDFormat,
  processMetadataToIPLDFormat,
} from '../src/ipld/chunker'
import { createNode, decodeNode, encodeNode, PBNode } from '../src/ipld/utils'
import { fileMetadata, IPLDNodeData, MetadataType, OffchainMetadata } from '../src/metadata'

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
      const data = decoded.data ? Buffer.from(decoded.data) : Buffer.from('')
      expect(data.toString()).toBe(text)
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
          maxNodeSize: maxChunkSize + NODE_METADATA_SIZE,
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

    it('create a file with long name should throw an error', async () => {
      const name = 'a'.repeat(MAX_NAME_SIZE + 1)
      const blockstore = new MemoryBlockstore()
      expect(() =>
        processFileToIPLDFormat(blockstore, [Buffer.from('hello')], BigInt(5), name),
      ).toThrow(`Filename is too long: ${name.length} > ${MAX_NAME_SIZE}`)
    })

    it('create a file with long name from buffer should throw an error', async () => {
      const name = 'a'.repeat(MAX_NAME_SIZE + 1)
      const blockstore = new MemoryBlockstore()
      await expect(
        processBufferToIPLDFormatFromChunks(blockstore, [], name, BigInt(5), fileBuilders),
      ).rejects.toThrow(`Filename is too long: ${name.length} > ${MAX_NAME_SIZE}`)
    })

    it('create a file dag with inlinks', async () => {
      const chunkLength = 1000
      const maxNodeSize = chunkLength + NODE_METADATA_SIZE
      const chunkNum = 10
      const chunk = 'h'.repeat(chunkLength)
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
          maxNodeSize,
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

    it('create a folder with long name should throw an error', async () => {
      const name = 'a'.repeat(MAX_NAME_SIZE + 1)
      const blockstore = new MemoryBlockstore()
      await expect(processFolderToIPLDFormat(blockstore, [], name, BigInt(1000))).rejects.toThrow(
        `Filename is too long: ${name.length} > ${MAX_NAME_SIZE}`,
      )
    })
  })

  describe('asyncronous file creation', () => {
    it('process chunks to IPLD format should return the leftover buffer', async () => {
      const filename = 'test.txt'
      const chunkSize = DEFAULT_MAX_CHUNK_SIZE
      const chunksCount = 1.5
      const buffer = Buffer.from(
        Array.from({ length: chunkSize * chunksCount })
          .map(() => Math.floor(Math.random() * 16).toString(16))
          .join(''),
      )

      const leftoverSize = buffer.length % chunkSize
      const blockstore = new MemoryBlockstore()
      const leftover = await processChunksToIPLDFormat(blockstore, [buffer], fileBuilders)
      expect(leftover.length).toBe(leftoverSize)
    })

    it('process chunks with exact chunk size len(leftover)=0', async () => {
      const filename = 'test.txt'
      const chunkSize = DEFAULT_MAX_CHUNK_SIZE
      const chunksCount = 4
      const buffer = Buffer.from(
        Array.from({ length: chunkSize * chunksCount })
          .map(() => Math.floor(Math.random() * 16).toString(16))
          .join(''),
      )

      const blockstore = new MemoryBlockstore()
      const leftover = await processChunksToIPLDFormat(blockstore, [buffer], fileBuilders)

      expect(leftover.length).toBe(0)
    })

    it('process file by chunks', async () => {
      const filename = 'test.txt'
      const chunkSize = DEFAULT_MAX_CHUNK_SIZE
      const chunksCount = 4.5
      const buffer = Buffer.from(
        Array.from({ length: chunkSize * chunksCount })
          .map(() => Math.floor(Math.random() * 16).toString(16))
          .join(''),
      )

      const blockstore = new MemoryBlockstore()
      const leftover = await processChunksToIPLDFormat(blockstore, [buffer], fileBuilders)
      const leftoverCid = createFileChunkIpldNode(leftover)
      await blockstore.put(cidOfNode(leftoverCid), encodeNode(leftoverCid))

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

      const headNode = decodeNode(await blockstore.get(headCID))
      expect(headNode?.Links.length).toBe(Math.ceil(chunksCount))
      expect(cidToString(headNode?.Links[headNode.Links.length - 1].Hash)).toEqual(
        cidToString(cidOfNode(leftoverCid)),
      )
      const ipldMetadata = IPLDNodeData.decode(headNode?.Data ?? new Uint8Array())
      expect(ipldMetadata.name).toBe(filename)
      expect(ipldMetadata.type).toBe(MetadataType.File)
      expect(ipldMetadata.linkDepth).toBe(1)
      expect(ipldMetadata.size!.toString()).toBe(buffer.length.toString())
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
      await processMetadataToIPLDFormat(blockstore, metadata)
      const nodes = await nodesFromBlockstore(blockstore)
      expect(nodes.length).toBe(1)
    })

    it('create a metadata dag with long name should throw an error', async () => {
      const name = 'a'.repeat(MAX_NAME_SIZE + 1)
      const metadata = fileMetadata(
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
        [
          {
            cid: cidToString(cidOfNode(createNode(Buffer.from(Math.random().toString())))),
            size: BigInt(1000),
          },
        ],
        BigInt(1000),
        name,
      )

      const blockstore = new MemoryBlockstore()
      await expect(processMetadataToIPLDFormat(blockstore, metadata)).rejects.toThrow(
        `Filename is too long: ${name.length} > ${MAX_NAME_SIZE}`,
      )
    })

    it('large metadata dag represented into multiple nodes', async () => {
      const metadata: OffchainMetadata = {
        type: 'file',
        dataCid: 'test',
        name: 'test',
        mimeType: 'text/plain'.repeat(1000),
        totalSize: BigInt(10000),
        totalChunks: 10,
        chunks: [],
      }

      const blockstore = new MemoryBlockstore()
      const headCID = await processMetadataToIPLDFormat(blockstore, metadata, {
        maxNodeSize: 2000,
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

  describe('nodes sizes', () => {
    it('file root node with inlinks', async () => {
      const maxNodeSize = 1000
      const maxChunkSize = maxNodeSize - NODE_METADATA_SIZE
      const maxLinkPerNode = Math.floor(maxChunkSize / LINK_SIZE_IN_BYTES)
      const buffer = Buffer.from('h'.repeat(maxChunkSize).repeat(maxLinkPerNode ** 3))

      const blockstore = new MemoryBlockstore()

      await processFileToIPLDFormat(
        blockstore,
        bufferToIterable(buffer),
        BigInt(buffer.length),
        'test.txt',
        {
          maxNodeSize,
          maxLinkPerNode,
        },
      )

      const nodes = await nodesFromBlockstore(blockstore)

      const inlinks = nodes.filter(
        (node) =>
          IPLDNodeData.decode(node.Data ?? new Uint8Array()).type === MetadataType.FileInlink,
      )
      inlinks.map((e) => e.Links.length).forEach((e) => expect(e).toBe(maxLinkPerNode))
    })

    it('folder root node with inlinks', async () => {
      const maxLinkPerNode = 4
      const maxNodeSize = maxLinkPerNode * LINK_SIZE_IN_BYTES + NODE_METADATA_SIZE
      const links = Array.from({ length: 16 }, () =>
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
      )

      const blockstore = new MemoryBlockstore()
      processFolderToIPLDFormat(blockstore, links, 'test', BigInt(1000), {
        maxLinkPerNode,
        maxNodeSize,
      })

      const nodes = await nodesFromBlockstore(blockstore)
      for (const node of nodes) {
        expect(node.Data?.length).toBeLessThanOrEqual(maxNodeSize)
      }

      const inlinks = nodes.filter(
        (node) =>
          IPLDNodeData.decode(node.Data ?? new Uint8Array()).type === MetadataType.FolderInlink,
      )
      inlinks.map((e) => e.Links.length).forEach((e) => expect(e).toBe(maxLinkPerNode))
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
