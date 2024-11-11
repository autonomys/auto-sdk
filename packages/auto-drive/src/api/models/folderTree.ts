import fs from 'fs'
import JSZip from 'jszip'
import { z } from 'zod'

export type FolderTreeFolder = {
  name: string
  type: 'folder'
  children: FolderTree[]
  id: string
}

export type FolderTreeFile = {
  name: string
  type: 'file'
  id: string
}

export type FolderTree = FolderTreeFolder | FolderTreeFile

export const FolderTreeFolderSchema = z.object({
  name: z.string(),
  type: z.literal('folder'),
  children: z.array(z.lazy(() => FolderTreeSchema)),
  id: z.string(),
})

export const FolderTreeFileSchema = z.object({
  name: z.string(),
  type: z.literal('file'),
  id: z.string(),
})

export const FolderTreeSchema: z.ZodType<FolderTree> = z.discriminatedUnion('type', [
  FolderTreeFolderSchema,
  FolderTreeFileSchema,
])

export const constructFromFileSystemEntries = (entries: string[]): FolderTree => {
  const root: FolderTreeFolder = {
    name: 'root',
    type: 'folder',
    children: [],
    id: 'root',
  }

  for (const entry of entries) {
    const pathParts = entry.split('/').filter(Boolean)
    let currentFolder = root

    for (const [index, part] of Array.from(pathParts.entries())) {
      // Check if the part already exists in the current folder's children
      let existingFolder = currentFolder.children.find((child) => child.name === part)

      if (!existingFolder) {
        // If it's the last part, create a file node
        if (index === pathParts.length - 1) {
          const fileNode: FolderTreeFile = {
            name: part,
            type: 'file',
            id: entry,
          }
          currentFolder.children.push(fileNode)
        } else {
          // Create a new folder node
          const folderNode: FolderTreeFolder = {
            name: part,
            type: 'folder',
            children: [],
            id: `${currentFolder.id.split('/').slice(1).join('/')}/${part}`,
          }
          currentFolder.children.push(folderNode)
          existingFolder = folderNode
        }
      }
      currentFolder = existingFolder as FolderTreeFolder // Move to the next folder
    }
  }

  return root.children.length === 1 ? root.children[0] : root
}

export const constructFromInput = (input: File[]): FolderTree => {
  return constructFromFileSystemEntries(
    Array.from(input).map((file) => {
      if (!file.webkitRelativePath) {
        throw new Error('webkitRelativePath is not supported')
      }
      return file.webkitRelativePath
    }),
  )
}

const addFilesToZip = (
  folder: JSZip,
  folderNode: FolderTreeFolder,
  files: Record<string, File | string>,
) => {
  folderNode.children.forEach((child) => {
    if (child.type === 'file') {
      const file = files[child.id]
      if (typeof file === 'string') {
        folder.file(child.name, fs.createReadStream(file))
      } else {
        folder.file(child.name, file)
      }
    } else if (child.type === 'folder') {
      const subFolder = folder.folder(child.name)
      if (!subFolder) {
        throw new Error('Failed to create folder in zip')
      }
      addFilesToZip(subFolder, child as FolderTreeFolder, files)
    }
  })
}

export const constructZipBlobFromTreeAndPaths = async (
  tree: FolderTree,
  files: Record<string, File | string>,
) => {
  if (tree.type === 'file') {
    throw new Error('Cannot construct zip from file')
  }

  const zip = new JSZip()
  addFilesToZip(zip, tree as FolderTreeFolder, files)

  return zip.generateAsync({ type: 'blob' })
}
