import { CID } from 'multiformats/cid'
import { FileUploadOptions } from '../metadata/index.js'
import { PBNode } from './index.js'
import {
  createChunkedFileIpldNode,
  createChunkedMetadataIpldNode,
  createFileChunkIpldNode,
  createFileInlinkIpldNode,
  createMetadataChunkIpldNode,
  createMetadataInlinkIpldNode,
  createSingleFileIpldNode,
  createSingleMetadataIpldNode,
} from './nodes.js'

export interface Builders {
  inlink: (links: CID[], size: number, linkDepth: number, chunkSize: number) => PBNode
  chunk: (data: Buffer, maxNodeSize?: number) => PBNode
  root: (
    links: CID[],
    size: bigint,
    linkDepth: number,
    name?: string,
    maxNodeSize?: number,
    fileUploadOptions?: FileUploadOptions,
  ) => PBNode
  single: (data: Buffer, filename?: string, fileUploadOptions?: FileUploadOptions) => PBNode
}
export const metadataBuilders: Builders = {
  inlink: createMetadataInlinkIpldNode,
  chunk: createMetadataChunkIpldNode,
  root: createChunkedMetadataIpldNode,
  single: createSingleMetadataIpldNode,
}

export const fileBuilders: Builders = {
  inlink: createFileInlinkIpldNode,
  chunk: createFileChunkIpldNode,
  root: createChunkedFileIpldNode,
  single: createSingleFileIpldNode,
}
