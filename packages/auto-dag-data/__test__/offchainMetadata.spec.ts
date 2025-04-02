import { MemoryBlockstore } from 'blockstore-core'
import {
  childrenMetadataFromNode,
  cidOfNode,
  cidToString,
  CompressionAlgorithm,
  createFolderIpldNode,
  createNode,
  createSingleFileIpldNode,
  EncryptionAlgorithm,
  fileMetadata,
  folderMetadata,
  processFolderToIPLDFormat,
} from '../src'

export const stringifyWithBigInt = (obj: any) => {
  return JSON.stringify(obj, (key, value) => (typeof value === 'bigint' ? value.toString() : value))
}

describe('offchain metadata', () => {
  describe('file metadata', () => {
    it('matches expected structure', () => {
      const buffer = Buffer.from('hello world')
      const cid = cidOfNode(createSingleFileIpldNode(buffer, 'test.txt'))
      const chunks = [{ size: BigInt(11).valueOf(), cid: cidToString(cid) }]
      const metadata = fileMetadata(cid, chunks, BigInt(buffer.length), 'test.txt')
      expect(metadata.name).toBe('test.txt')
      expect(metadata.totalSize === BigInt(buffer.length)).toBe(true)
      expect(metadata.type).toBe('file')
      expect(metadata.dataCid).toBe(cidToString(cid))
      expect(stringifyWithBigInt(metadata.chunks)).toEqual(stringifyWithBigInt(chunks))
      expect(metadata.uploadOptions).toEqual({
        compression: undefined,
        encryption: undefined,
      })
      expect(metadata.totalChunks).toBe(1)
      expect(metadata.mimeType).toBeUndefined()
    })

    it('matches expected structure with mime type', () => {
      const buffer = Buffer.from('hello world')
      const cid = cidOfNode(createSingleFileIpldNode(buffer, 'test.txt'))
      const chunks = [{ size: BigInt(11).valueOf(), cid: cidToString(cid) }]
      const metadata = fileMetadata(cid, chunks, BigInt(buffer.length), 'test.txt', 'text/plain')
      expect(metadata.name).toBe('test.txt')
      expect(metadata.totalSize === BigInt(buffer.length)).toBe(true)
      expect(metadata.type).toBe('file')
      expect(metadata.dataCid).toBe(cidToString(cid))
      expect(stringifyWithBigInt(metadata.chunks)).toEqual(stringifyWithBigInt(chunks))
      expect(metadata.uploadOptions).toEqual({
        compression: undefined,
        encryption: undefined,
      })
      expect(metadata.mimeType).toBe('text/plain')
    })
  })

  describe('folder metadata', () => {
    it('matches expected structure', async () => {
      const CIDs = Array.from({ length: 10 }, () =>
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
      )
      const name = 'test'
      const childSize = BigInt(1000)
      const blockstore = new MemoryBlockstore()
      const folder = await processFolderToIPLDFormat(blockstore, CIDs, 'test', childSize)
      const children = CIDs.map((cid) => ({
        cid: cidToString(cid),
        totalSize: childSize,
        type: 'file' as const,
      }))

      const metadata = folderMetadata(cidToString(folder), children, name)

      const totalSize = childSize * BigInt(CIDs.length)
      expect(metadata.name).toBe(name)
      expect(metadata.totalSize.toString()).toBe(totalSize.toString())
      expect(metadata.type).toBe('folder')
      expect(metadata.dataCid).toBe(cidToString(folder))
      expect(stringifyWithBigInt(metadata.children)).toEqual(stringifyWithBigInt(children))
      expect(metadata.uploadOptions).toEqual({
        compression: undefined,
        encryption: undefined,
      })
    })

    it('matches expected structure with upload options', async () => {
      const CIDs = Array.from({ length: 10 }, () =>
        cidOfNode(createNode(Buffer.from(Math.random().toString()))),
      )
      const childSize = BigInt(1000)
      const name = 'test'
      const blockstore = new MemoryBlockstore()
      const folder = await processFolderToIPLDFormat(blockstore, CIDs, name, childSize)
      const children = CIDs.map((cid) => ({
        cid: cidToString(cid),
        totalSize: childSize,
        type: 'file' as const,
      }))

      const metadata = folderMetadata(cidToString(folder), children, name, {
        compression: {
          algorithm: CompressionAlgorithm.ZLIB,
          level: 1,
        },
        encryption: {
          algorithm: EncryptionAlgorithm.AES_256_GCM,
        },
      })

      const totalSize = childSize * BigInt(CIDs.length)
      expect(metadata.name).toBe(name)
      expect(metadata.totalSize.toString()).toBe(totalSize.toString())
      expect(metadata.type).toBe('folder')
      expect(metadata.dataCid).toBe(cidToString(folder))
      expect(stringifyWithBigInt(metadata.children)).toEqual(stringifyWithBigInt(children))
      expect(metadata.uploadOptions).toEqual({
        compression: {
          algorithm: CompressionAlgorithm.ZLIB,
          level: 1,
        },
        encryption: {
          algorithm: EncryptionAlgorithm.AES_256_GCM,
        },
      })
    })

    it('file children metadata from node', () => {
      const node = createSingleFileIpldNode(Buffer.from('hello world'), 'test.txt')
      const metadata = childrenMetadataFromNode(node)
      expect(metadata.cid).toBe(cidToString(cidOfNode(node)))
      expect(metadata.totalSize.toString()).toBe('11')
      expect(metadata.type).toBe('file')
      expect(metadata.name).toBe('test.txt')
    })

    it('folder children metadata from node', () => {
      const name = 'test'
      const size = BigInt(1000)
      const cid = cidOfNode(createFolderIpldNode([], name, 0, size))
      const node = createFolderIpldNode([cid], name, 0, size)
      const metadata = childrenMetadataFromNode(node)
      expect(metadata.cid).toBe(cidToString(cidOfNode(node)))
      expect(metadata.totalSize.toString()).toBe(size.toString())
      expect(metadata.type).toBe('folder')
      expect(metadata.name).toBe(name)
    })
  })
})
