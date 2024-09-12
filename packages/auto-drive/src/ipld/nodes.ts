import { createNode, PBNode } from '@ipld/dag-pb'
import { CID } from 'multiformats/cid'
import { OffchainMetadata } from '../metadata/index.js'
import { encodeIPLDNodeData, IPLDNodeData, MetadataType } from '../metadata/onchain/index.js'
import { ensureNodeMaxSize } from './chunker.js'

/// Creates a chunk ipld node
export const createChunkIpldNode = (data: Buffer, size: bigint): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.FileChunk,
        size,
        linkDepth: 0,
        data,
      }),
      [],
    ),
  )

// Creates a file ipld node
// links: the CIDs of the file's contents
// @todo: add the file's metadata
export const createChunkedFileIpldNode = (links: CID[], size: bigint, name?: string): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.File,
        name,
        size,
        linkDepth: 1,
      }),
      links.map((cid) => ({ Hash: cid })),
    ),
  )

// Creates a file ipld node
// links: the CIDs of the file's contents
// @todo: add the file's metadata
export const createSingleFileIpldNode = (
  data: Buffer,
  size: bigint,
  name?: string,
  // fileMetadata: Omit<OffchainFileMetadata, 'size'>,
): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.File,
        name,
        size,
        linkDepth: 0,
        data,
      }),
      [],
    ),
  )

// Creates a folder ipld node
// links: the CIDs of the folder's contents
// @todo: add the folder's metadata
export const createFolderIpldNode = (links: CID[], name: string, size: bigint): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.Folder,
        name,
        size,
        linkDepth: 0,
      }),
      links.map((cid) => ({ Hash: cid })),
    ),
  )

/// Creates a metadata ipld node
export const createMetadataNode = (metadata: OffchainMetadata): PBNode => {
  const data = Buffer.from(JSON.stringify(metadata))

  return ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.Metadata,
        name: metadata.name,
        linkDepth: 0,
        data,
      }),
    ),
  )
}
