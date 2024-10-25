import { PBNode } from '@ipld/dag-pb'
import { CID } from 'multiformats'
import { cidOfNode, cidToString, stringToCid } from '../../cid/index.js'
import { IPLDBlockstore } from '../../ipld/index.js'
import { decodeNode } from '../../ipld/utils.js'
import { decodeIPLDNodeData, IPLDNodeData, MetadataType } from '../onchain/index.js'

interface ChildrenMetadata {
  type: 'folder' | 'file'
  name?: string
  cid: string
  totalSize: number
}

export type OffchainFolderMetadata = {
  type: 'folder'
  dataCid: string
  name?: string
  totalSize: number
  totalFiles: number
  children: ChildrenMetadata[]
}

export const childrenMetadataFromNode = (node: PBNode): ChildrenMetadata => {
  const ipldData = IPLDNodeData.decode(node.Data!)
  if (ipldData.type !== MetadataType.File && ipldData.type !== MetadataType.Folder) {
    throw new Error('Invalid metadata type')
  }

  return {
    type: ipldData.type === MetadataType.File ? 'file' : 'folder',
    cid: cidToString(cidOfNode(node)),
    totalSize: ipldData.size ?? 0,
    name: ipldData.name,
  }
}

export const folderMetadata = (
  cid: CID | string,
  children: ChildrenMetadata[],
  name?: string | null,
): OffchainFolderMetadata => {
  cid = typeof cid === 'string' ? cid : cidToString(cid)

  return {
    dataCid: cid,
    totalSize: children.reduce((acc, child) => acc + child.totalSize, 0),
    totalFiles: children.length,
    children,
    type: 'folder',
    name: name ?? undefined,
  }
}

export const constructFolderMetadataFromBlockstore = async (
  cid: CID | string,
  blockstore: IPLDBlockstore,
): Promise<OffchainFolderMetadata> => {
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
    const ipldData = children.map((e) => decodeIPLDNodeData(e))
    isAnyoneInLink = ipldData.some((e) => e.linkDepth > 0)
  }

  return folderMetadata(
    cid,
    children.map((e) => childrenMetadataFromNode(decodeNode(e))),
    ipldData.name,
  )
}
