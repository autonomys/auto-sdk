import {
  cidOfNode,
  cidToString,
  createChunkedFileIpldNode,
  createFileChunkIpldNode,
  createSingleFileIpldNode,
  fileMetadata,
} from '../src/index.js'
import { createMetadataNode, createNode, DEFAULT_NODE_MAX_SIZE } from '../src/ipld/index.js'
import { IPLDNodeData, MetadataType } from '../src/metadata/onchain/protobuf/OnchainMetadata.js'
import { stringifyMetadata } from '../src/utils/metadata.js'

describe('node creation', () => {
  describe('files nodes', () => {
    it('single file node | correctly params setup', () => {
      const filename = 'test.txt'
      const buffer = Buffer.from('hello world')
      const node = createSingleFileIpldNode(buffer, filename)
      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.name).toBe(filename)
      expect(decoded.size!.toString()).toBe(buffer.length.toString())
      const data = decoded.data ? Buffer.from(decoded.data) : Buffer.from('')
      expect(data.toString()).toBe(buffer.toString())
    })

    it('single file root node | no name', () => {
      const buffer = Buffer.from('hello world')
      const node = createSingleFileIpldNode(buffer)
      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.type).toBe(MetadataType.File)
      expect(decoded.name).toBeUndefined()
      expect(decoded.size!.toString()).toBe(buffer.length.toString())
      const data = decoded.data ? Buffer.from(decoded.data) : Buffer.from('')
      expect(data.toString()).toBe(buffer.toString())
    })

    it('single file root node | buffer too large', () => {
      const maxNodeSize = DEFAULT_NODE_MAX_SIZE
      const buffer = Buffer.from('h'.repeat(maxNodeSize))
      expect(() => createSingleFileIpldNode(buffer, 'test.txt')).toThrow()
    })

    it('chunked file root node | correctly params setup', () => {
      const links = Array.from({ length: 10 }, () =>
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
      )
      const size = BigInt(1000)
      const linkDepth = 1
      const filename = 'test.txt'
      const node = createChunkedFileIpldNode(links, BigInt(size), linkDepth, filename)

      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.type).toBe(MetadataType.File)
      expect(decoded.name).toBe(filename)
      expect(decoded.size!.toString()).toBe(size.toString())
      expect(decoded.linkDepth).toBe(linkDepth)
    })

    it('chunked file root node | no name', () => {
      const links = Array.from({ length: 10 }, () =>
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
      )
      const size = BigInt(1000)
      const linkDepth = 1
      const node = createChunkedFileIpldNode(links, size, linkDepth)

      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.type).toBe(MetadataType.File)
      expect(decoded.name).toBeUndefined()
      expect(decoded.size!.toString()).toBe(size.toString())
      expect(decoded.linkDepth).toBe(linkDepth)
    })

    it('file chunk node | correctly params setup', () => {
      const buffer = Buffer.from('hello world')
      const node = createFileChunkIpldNode(buffer)

      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.type).toBe(MetadataType.FileChunk)
      expect(decoded.name).toBeUndefined()
      expect(decoded.size!.toString()).toBe(buffer.length.toString())
      expect(decoded.linkDepth).toBe(0)
    })
  })

  describe('metadata nodes', () => {
    it('metadata node | correctly params setup', () => {
      const randomCID = cidOfNode(createNode(Buffer.from(Math.random().toString())))
      const metadata = fileMetadata(
        randomCID,
        [{ cid: cidToString(randomCID), size: BigInt(1000) }],
        BigInt(1000),
        'test.txt',
      )
      const metadataSize = Buffer.from(stringifyMetadata(metadata)).length

      const metadataNode = createMetadataNode(metadata)

      const decoded = IPLDNodeData.decode(metadataNode.Data ?? new Uint8Array())
      expect(decoded.type).toBe(MetadataType.Metadata)
      expect(decoded.name).toBe('test.txt')
      expect(decoded.size!.toString()).toBe(BigInt(metadataSize).toString())
    })
  })
})
