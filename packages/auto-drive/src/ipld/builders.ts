import { CID } from 'multiformats/cid'
import { PBNode } from '../ipld/index.js'
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
  chunk: (data: Buffer) => PBNode
  root: (
    links: CID[],
    size: number,
    linkDepth: number,
    name?: string,
    maxNodeSize?: number,
  ) => PBNode
  single: (data: Buffer, filename?: string) => PBNode
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
