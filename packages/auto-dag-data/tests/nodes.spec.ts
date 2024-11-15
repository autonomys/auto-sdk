import {
  cidOfNode,
  createChunkedFileIpldNode,
  createFileChunkIpldNode,
  createSingleFileIpldNode,
} from '../src/index.js'
import { createNode } from '../src/ipld/index.js'
import { IPLDNodeData, MetadataType } from '../src/metadata/onchain/protobuf/OnchainMetadata.js'

describe('node creation', () => {
  describe('files nodes', () => {
    it('single file node | correctly params setup', () => {
      const filename = 'test.txt'
      const buffer = Buffer.from('hello world')
      const node = createSingleFileIpldNode(buffer, filename)
      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.name).toBe(filename)
      expect(decoded.size!.toString()).toBe(buffer.length.toString())
      expect(Buffer.from(decoded.data ?? '').toString()).toBe(buffer.toString())
    })

    it('single file root node | no name', () => {
      const buffer = Buffer.from('hello world')
      const node = createSingleFileIpldNode(buffer)
      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.type).toBe(MetadataType.File)
      expect(decoded.name).toBeUndefined()
      expect(decoded.size!.toString()).toBe(buffer.length.toString())
      expect(Buffer.from(decoded.data ?? '').toString()).toBe(buffer.toString())
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
})
