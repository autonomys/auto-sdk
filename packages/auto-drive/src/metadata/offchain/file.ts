import { CID } from 'multiformats'
import { cidToString } from '../../index.js'

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

export const fileMetadata = (
  headCID: CID,
  chunks: ChunkInfo[],
  totalSize: number,
  name?: string | null,
  mimeType?: string | null,
): OffchainFileMetadata => {
  return {
    type: 'file',
    dataCid: cidToString(headCID),
    name: name ?? undefined,
    mimeType: mimeType ?? undefined,
    totalSize,
    totalChunks: chunks.length,
    chunks,
  }
}
