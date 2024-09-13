import { createNode } from '@ipld/dag-pb'
import { cidOfNode, createChunkedFileIpldNode, createSingleFileIpldNode } from '../src/index.js'
import { createChunkIpldNode } from '../src/ipld/nodes.js'
import { IPLDNodeData, MetadataType } from '../src/metadata/onchain/protobuf/OnchainMetadat.js'

describe('node creation', () => {
  describe('files nodes', () => {
    it('single file node | correctly params setup', () => {
      const filename = 'test.txt'
      const buffer = Buffer.from('hello world')
      const node = createSingleFileIpldNode(buffer, filename)
      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.name).toBe(filename)
      expect(decoded.size).toBe(buffer.length)
      expect(Buffer.from(decoded.data ?? '').toString()).toBe(buffer.toString())
    })

    it('single file root node | no name', () => {
      const buffer = Buffer.from('hello world')
      const node = createSingleFileIpldNode(buffer)
      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.type).toBe(MetadataType.File)
      expect(decoded.name).toBeUndefined()
      expect(decoded.size).toBe(buffer.length)
      expect(Buffer.from(decoded.data ?? '').toString()).toBe(buffer.toString())
    })

    it('chunked file root node | correctly params setup', () => {
      const links = Array.from({ length: 10 }, () =>
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
      )
      const size = 1000
      const linkDepth = 1
      const filename = 'test.txt'
      const node = createChunkedFileIpldNode(links, size, linkDepth, filename)

      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.type).toBe(MetadataType.File)
      expect(decoded.name).toBe(filename)
      expect(decoded.size).toBe(size)
      expect(decoded.linkDepth).toBe(linkDepth)
    })

    it('chunked file root node | no name', () => {
      const links = Array.from({ length: 10 }, () =>
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
      )
      const size = 1000
      const linkDepth = 1
      const node = createChunkedFileIpldNode(links, size, linkDepth)

      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.type).toBe(MetadataType.File)
      expect(decoded.name).toBeUndefined()
      expect(decoded.size).toBe(size)
      expect(decoded.linkDepth).toBe(linkDepth)
    })

    it('file chunk node | correctly params setup', () => {
      const buffer = Buffer.from('hello world')
      const node = createChunkIpldNode(buffer)

      const decoded = IPLDNodeData.decode(node.Data ?? new Uint8Array())
      expect(decoded.type).toBe(MetadataType.FileChunk)
      expect(decoded.name).toBeUndefined()
      expect(decoded.size).toBe(buffer.length)
      expect(decoded.linkDepth).toBe(0)
    })
  })
})
