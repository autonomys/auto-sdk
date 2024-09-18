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

export const folderMetadata = (
  cid: string,
  children: ChildrenMetadata[],
  name?: string,
): OffchainFolderMetadata => {
  return {
    dataCid: cid,
    totalSize: children.reduce((acc, child) => acc + child.totalSize, 0),
    totalFiles: children.length,
    children,
    type: 'folder',
    name,
  }
}
