import { createNode } from '@ipld/dag-pb'
import { cidOfNode } from '../src'
import { createFileIPLDDag, createFolderIPLDDag, createMetadataIPLDDag } from '../src/ipld/chunker'
import { IPLDNodeData, MetadataType, OffchainMetadata } from '../src/metadata'

describe('chunker', () => {
  describe('file creation', () => {
    it('create a file dag from a small buffer', () => {
      const text = 'hello world'
      const name = 'test.txt'
      const dag = createFileIPLDDag(Buffer.from(text), name)
      expect(dag.nodes.size).toBe(1)

      const node = dag.nodes.get(dag.headCID)
      expect(node).toBeDefined()
      expect(node?.Data).toBeDefined()
      const decoded = IPLDNodeData.decode(node?.Data ?? new Uint8Array())
      expect(decoded.data).toBeDefined()

      /// Check the metadata
      expect(decoded.name).toBe(name)
      expect(decoded.type).toBe(MetadataType.File)
      expect(Buffer.from(decoded.data ?? '').toString()).toBe(text)
      expect(decoded.linkDepth).toBe(0)
      expect(decoded.size).toBe(text.length)

      /// Check no links
      expect(node?.Links.length).toBe(0)
    })

    it('create a file dag from a large buffer', () => {
      const chunkSize = 1000
      const chunkNum = 10
      const chunk = 'h'.repeat(chunkSize)
      const text = chunk.repeat(chunkNum)

      const name = 'test.txt'

      const dag = createFileIPLDDag(Buffer.from(text), name, {
        chunkSize,
        maxLinkPerNode: chunkSize / 64,
      })

      expect(dag.nodes.size).toBe(chunkNum + 1)

      const head = dag.nodes.get(dag.headCID)
      expect(head?.Data).toBeDefined()
      expect(head).toBeDefined()
      expect(head?.Links.length).toBe(chunkNum)

      const decoded = IPLDNodeData.decode(head?.Data ?? new Uint8Array())
      expect(decoded.name).toBe(name)
      expect(decoded.type).toBe(MetadataType.File)
      expect(decoded.linkDepth).toBe(1)
      expect(decoded.size).toBe(text.length)

      Array.from(dag.nodes.entries()).forEach(([cid, node]) => {
        if (cid !== dag.headCID) {
          expect(node?.Links.length).toBe(0)
        }
      })
    })

    it('create a file dag with inlinks', () => {
      const chunkSize = 1000
      const chunkNum = 10
      const chunk = 'h'.repeat(chunkSize)
      const name = 'test.txt'
      const text = chunk.repeat(chunkNum)

      /// 10 chunks + 3 inlinks + root
      const EXPECTED_NODE_COUNT = 14

      const dag = createFileIPLDDag(Buffer.from(text), name, {
        chunkSize,
        maxLinkPerNode: 4,
      })

      expect(dag.nodes.size).toBe(EXPECTED_NODE_COUNT)

      let [rootCount, inlinkCount, chunkCount] = [0, 0, 0]

      Array.from(dag.nodes.values()).forEach((node) => {
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
      expect(inlinkCount).toBe(3)
      expect(chunkCount).toBe(10)
    })
  })

  describe('folder creation', () => {
    it('create a folder dag from a small buffer', () => {
      const links = Array.from({ length: 1 }, () =>
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
      )
      const name = 'folder'
      const size = 1000
      const dag = createFolderIPLDDag(links, name, size, {
        maxLinkPerNode: 4,
      })

      expect(dag.nodes.size).toBe(1)
      const node = dag.nodes.get(dag.headCID)
      expect(node).toBeDefined()
      expect(node?.Data).toBeDefined()
      const decoded = IPLDNodeData.decode(node?.Data ?? new Uint8Array())
      expect(decoded.name).toBe(name)
      expect(decoded.type).toBe(MetadataType.Folder)
      expect(decoded.linkDepth).toBe(0)
      expect(decoded.size).toBe(size)
    })

    it('create a folder dag with inlinks', () => {
      const links = Array.from({ length: 10 }, () =>
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
      )
      const name = 'folder'
      const size = 1000

      /// 3 inlinks + root
      const EXPECTED_NODE_COUNT = 4

      const dag = createFolderIPLDDag(links, name, size, {
        maxLinkPerNode: 4,
      })

      expect(dag.nodes.size).toBe(EXPECTED_NODE_COUNT)

      let [rootCount, inlinkCount] = [0, 0, 0]

      Array.from(dag.nodes.values()).forEach((node) => {
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
    it('create a metadata dag from a small buffer', () => {
      const metadata: OffchainMetadata = {
        type: 'file',
        dataCid: 'test',
        name: 'test',
        mimeType: 'text/plain',
        totalSize: 1000,
        totalChunks: 10,
        chunks: [],
      }

      const dag = createMetadataIPLDDag(metadata)
      expect(dag.nodes.size).toBe(1)
    })

    it('large metadata dag represented into multiple nodes', () => {
      const metadata: OffchainMetadata = {
        type: 'file',
        dataCid: 'test',
        name: 'test',
        mimeType: 'text/plain'.repeat(100),
        totalSize: 1000,
        totalChunks: 10,
        chunks: [],
      }

      const dag = createMetadataIPLDDag(metadata, {
        chunkSize: 200,
        maxLinkPerNode: 2,
      })
      expect(dag.nodes.size).toBeGreaterThan(1)
    })
  })
})
