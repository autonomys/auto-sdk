import { createNode, PBNode } from '@ipld/dag-pb'
import { CID } from 'multiformats/cid'

/// @todo: add the file's metadata
export const encodeFileIpldNodeData = (buffer: Buffer | null): Uint8Array => {
  return buffer ? new Uint8Array(buffer.buffer) : new Uint8Array([])
}

/// @todo: add the folder's metadata
export const encodeFolderIpldNodeData = (): Uint8Array => {
  return new Uint8Array([])
}

/// Creates a chunk ipld node
export const createChunkIpldNode = (buffer: Buffer): PBNode =>
  createNode(encodeFileIpldNodeData(buffer), [])

// Creates a file ipld node
// links: the CIDs of the file's contents
// @todo: add the file's metadata
export const createChunkedFileIpldNode = (links: CID[]): PBNode =>
  createNode(
    encodeFileIpldNodeData(null),
    links.map((cid) => ({ Hash: cid })),
  )

// Creates a file ipld node
// links: the CIDs of the file's contents
// @todo: add the file's metadata
export const createSingleFileIpldNode = (buffer: Buffer): PBNode =>
  createNode(encodeFileIpldNodeData(buffer), [])

// Creates a folder ipld node
// links: the CIDs of the folder's contents
// @todo: add the folder's metadata
export const createFolderIpldNode = (links: CID[]): PBNode =>
  createNode(
    encodeFolderIpldNodeData(),
    links.map((cid) => ({ Hash: cid })),
  )
