import { PBNode } from '@ipld/dag-pb'
import { BaseBlockstore } from 'blockstore-core'
import { CID } from 'multiformats'
import { cidOfNode, cidToString, IPLDNodeData, MetadataType } from '../../index.js'

export type OffchainFileMetadata = {
  type: 'file'
  dataCid: string
  name?: string
  mimeType?: string
  totalSize: number
  totalChunks: number
  chunks: ChunkInfo[]
}

export interface ChunkInfo {
  size: number
  cid: string
}

export const fileMetadata = async (
  headCID: CID,
  chunks: ChunkInfo[],
  totalSize: number,
  name?: string,
  mimeType?: string,
): Promise<OffchainFileMetadata> => {
  return {
    type: 'file',
    dataCid: cidToString(headCID),
    name,
    mimeType,
    totalSize,
    totalChunks: chunks.length,
    chunks,
  }
}
