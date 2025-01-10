import { CID } from 'multiformats'
import { cidToString, FileUploadOptions } from '../../index.js'

export type OffchainFileMetadata = {
  type: 'file'
  dataCid: string
  name?: string
  mimeType?: string
  totalSize: bigint
  totalChunks: number
  chunks: ChunkInfo[]
  uploadOptions?: FileUploadOptions
}

export interface ChunkInfo {
  size: bigint
  cid: string
}

export const fileMetadata = (
  headCID: CID,
  chunks: ChunkInfo[],
  totalSize: bigint,
  name?: string | null,
  mimeType?: string | null,
  uploadOptions: FileUploadOptions = {
    compression: undefined,
    encryption: undefined,
  },
): OffchainFileMetadata => {
  return {
    type: 'file',
    dataCid: cidToString(headCID),
    name: name ?? undefined,
    mimeType: mimeType ?? undefined,
    totalSize,
    totalChunks: chunks.length,
    chunks,
    uploadOptions,
  }
}
