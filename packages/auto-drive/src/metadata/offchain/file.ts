import { PBNode } from '@ipld/dag-pb'
import { BaseBlockstore } from 'blockstore-core'
import { CID } from 'multiformats'
import {
  cidOfNode,
  cidToString,
  decodeIPLDNodeData,
  IPLDBlockstore,
  IPLDNodeData,
  MetadataType,
  stringToCid,
} from '../../index.js'
import { decodeNode } from '../../ipld/utils.js'

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

export const constructFileMetadataFromBlockstore = async (
  cid: CID | string,
  blockstore: IPLDBlockstore,
  mimeType?: string | null,
): Promise<OffchainFileMetadata> => {
  cid = typeof cid === 'string' ? stringToCid(cid) : cid

  const node = await blockstore.get(cid)
  const decoded = decodeNode(node)
  const ipldData = IPLDNodeData.decode(decoded.Data!)

  let children = await Promise.all(decoded.Links!.map((link) => blockstore.get(link.Hash)))
  let isAnyoneInLink = children.some((e) => decodeIPLDNodeData(e).linkDepth > 0)

  while (isAnyoneInLink) {
    const unflattenedChildren = await Promise.all(
      children.map((e) => {
        const decoded = decodeNode(e)
        const ipldData = decodeIPLDNodeData(e)

        return ipldData.linkDepth > 0
          ? Promise.all(decoded.Links!.map((link) => blockstore.get(link.Hash)))
          : [e]
      }),
    )

    children = unflattenedChildren.flat()
  }

  const totalSize = children.reduce((acc, e) => acc + (decodeIPLDNodeData(e).size ?? 0), 0)

  return fileMetadata(
    cid,
    children.map((e) => ({
      size: decodeIPLDNodeData(e).size ?? 0,
      cid: cidToString(cidOfNode(decodeNode(e))),
    })),
    totalSize,
    ipldData.name,
    mimeType,
  )
}
