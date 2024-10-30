import { CID } from 'multiformats'
import { cidOfNode, cidToString } from '../../cid/index.js'
import { PBNode } from '../../ipld/index.js'
import { FileUploadOptions, IPLDNodeData, MetadataType } from '../onchain/index.js'

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
  uploadOptions: FileUploadOptions
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
  uploadOptions: FileUploadOptions = {},
): OffchainFolderMetadata => {
  cid = typeof cid === 'string' ? cid : cidToString(cid)

  return {
    dataCid: cid,
    totalSize: children.reduce((acc, child) => acc + child.totalSize, 0),
    totalFiles: children.length,
    children,
    type: 'folder',
    name: name ?? undefined,
    uploadOptions,
  }
}
