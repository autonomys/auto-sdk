import { createFileIPLDDag } from '../src/ipld/chunker.js'
import { IPLDNodeData, MetadataType } from '../src/metadata/onchain/protobuf/onchainMetadata.js'

describe('ipld', () => {
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
  })
})
