import { cidOfNode, cidToString, IPLDDag, IPLDNodeData, MetadataType } from '../../index.js'

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
  const chunks = Array.from(dag.nodes.values()).filter(
    (n) => n.Data && IPLDNodeData.decode(n.Data).data,
  )

  return {
    type: 'file',
    dataCid: cidToString(dag.headCID),
    name,
    mimeType,
    totalSize,
    totalChunks: chunks.length,
    chunks: chunks.map((chunk) => ({
      cid: cidToString(cidOfNode(chunk)),
      size: chunk.Data?.length ?? 0,
    })),
  }
}
