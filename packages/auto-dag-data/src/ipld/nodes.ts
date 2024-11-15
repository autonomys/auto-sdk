import { CID } from 'multiformats/cid'
import { FileUploadOptions, OffchainMetadata } from '../metadata/index.js'
import { encodeIPLDNodeData, MetadataType } from '../metadata/onchain/index.js'
import { stringifyMetadata } from '../utils/metadata.js'
import { DEFAULT_MAX_CHUNK_SIZE, ensureNodeMaxSize } from './chunker.js'
import { createNode, PBNode } from './index.js'

/// Creates a file chunk ipld node
export const createFileChunkIpldNode = (
  data: Buffer,
  maxNodeSize: number = DEFAULT_MAX_CHUNK_SIZE,
): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.FileChunk,
        size: BigInt(data.length),
        linkDepth: 0,
        data,
      }),
      [],
    ),
    maxNodeSize,
  )

// Creates a file ipld node
// links: the CIDs of the file's contents
// @todo: add the file's metadata
export const createChunkedFileIpldNode = (
  links: CID[],
  size: bigint,
  linkDepth: number,
  name?: string,
  maxNodeSize: number = DEFAULT_MAX_CHUNK_SIZE,
  uploadOptions?: FileUploadOptions,
): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.File,
        name,
        size,
        linkDepth,
        uploadOptions,
      }),
      links.map((cid) => ({ Hash: cid })),
    ),
    maxNodeSize,
  )
// Creates a file ipld node
// links: the CIDs of the file's contents
export const createFileInlinkIpldNode = (
  links: CID[],
  size: number,
  linkDepth: number,
  maxNodeSize: number = DEFAULT_MAX_CHUNK_SIZE,
): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.FileInlink,
        size: BigInt(size),
        linkDepth,
      }),
      links.map((cid) => ({ Hash: cid })),
    ),
    maxNodeSize,
  )

// Creates a file ipld node
// links: the CIDs of the file's contents
// @todo: add the file's metadata
export const createSingleFileIpldNode = (
  data: Buffer,
  name?: string,
  uploadOptions?: FileUploadOptions,
): PBNode =>
  createNode(
    encodeIPLDNodeData({
      type: MetadataType.File,
      name,
      size: BigInt(data.length),
      linkDepth: 0,
      data,
      uploadOptions,
    }),
    [],
  )

// Creates a file ipld node
// links: the CIDs of the file's contents
// @todo: add the file's metadata
export const createMetadataInlinkIpldNode = (
  links: CID[],
  size: number,
  linkDepth: number,
  maxNodeSize: number = DEFAULT_MAX_CHUNK_SIZE,
): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.FileInlink,
        size: BigInt(size),
        linkDepth,
      }),
      links.map((cid) => ({ Hash: cid })),
    ),
    maxNodeSize,
  )

// Creates a file ipld node
// links: the CIDs of the file's contents
// @todo: add the file's metadata
export const createSingleMetadataIpldNode = (data: Buffer, name?: string): PBNode =>
  createNode(
    encodeIPLDNodeData({
      type: MetadataType.Metadata,
      name,
      size: BigInt(data.length),
      linkDepth: 0,
      data,
    }),
    [],
  )

export const createMetadataChunkIpldNode = (
  data: Buffer,
  maxNodeSize: number = DEFAULT_MAX_CHUNK_SIZE,
): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.MetadataChunk,
        size: BigInt(data.length),
        linkDepth: 0,
        data,
      }),
    ),
    maxNodeSize,
  )

export const createChunkedMetadataIpldNode = (
  links: CID[],
  size: bigint,
  linkDepth: number,
  name?: string,
  maxNodeSize: number = DEFAULT_MAX_CHUNK_SIZE,
): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.Metadata,
        name,
        size,
        linkDepth,
      }),
      links.map((cid) => ({ Hash: cid })),
    ),
    maxNodeSize,
  )

// Creates a folder ipld node
// links: the CIDs of the folder's contents
// @todo: add the folder's metadata
export const createFolderIpldNode = (
  links: CID[],
  name: string,
  linkDepth: number,
  size: bigint,
  maxNodeSize: number = DEFAULT_MAX_CHUNK_SIZE,
  uploadOptions?: FileUploadOptions,
): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.Folder,
        name,
        size,
        linkDepth,
        uploadOptions,
      }),
      links.map((cid) => ({ Hash: cid })),
    ),
    maxNodeSize,
  )

export const createFolderInlinkIpldNode = (
  links: CID[],
  linkDepth: number,
  maxNodeSize: number = DEFAULT_MAX_CHUNK_SIZE,
): PBNode =>
  ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.FolderInlink,
        linkDepth,
      }),
      links.map((cid) => ({ Hash: cid })),
    ),
    maxNodeSize,
  )

/// Creates a metadata ipld node
export const createMetadataNode = (
  metadata: OffchainMetadata,
  maxNodeSize: number = DEFAULT_MAX_CHUNK_SIZE,
): PBNode => {
  const data = Buffer.from(stringifyMetadata(metadata))

  return ensureNodeMaxSize(
    createNode(
      encodeIPLDNodeData({
        type: MetadataType.Metadata,
        name: metadata.name,
        linkDepth: 0,
        data,
      }),
    ),
    maxNodeSize,
  )
}
