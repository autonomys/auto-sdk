import { cidOfNode, cidToString, IPLDDag } from '../../index.js'

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
  dag: IPLDDag,
  totalSize: number,
  name?: string,
  mimeType?: string,
): OffchainFileMetadata => {
  return {
    type: 'file',
    dataCid: cidToString(dag.headCID),
    name,
    mimeType,
    totalSize,
    totalChunks: dag.nodes.size,
    chunks: Array.from(dag.nodes.values()).map((chunk) => ({
      cid: cidToString(cidOfNode(chunk)),
      size: chunk.Data?.length ?? 0,
    })),
  }
}
