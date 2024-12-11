import { WriteStream, createReadStream } from 'fs'
import fs from 'fs/promises'
import JSZip from 'jszip'
import path from 'path'
import { FolderTree, FolderTreeFolder } from '../api/models/folderTree'

export const getFiles = async (folderPath: string): Promise<string[]> => {
  const stat = await fs.stat(folderPath)

  if (stat.isDirectory()) {
    const files = await fs.readdir(folderPath)
    const promises = files.map((file) => getFiles(path.join(folderPath, file)))
    const allFiles = await Promise.all(promises)
    return allFiles.flat()
  } else {
    return [folderPath]
  }
}

export const createWriteStreamAdapter = (
  nodeWriteStream: WriteStream,
): WritableStream<Uint8Array> => {
  return new WritableStream({
    write(chunk) {
      return new Promise((resolve, reject) => {
        nodeWriteStream.write(chunk, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    },
    close() {
      nodeWriteStream.end()
    },
    abort(err) {
      nodeWriteStream.destroy(err)
    },
  })
}

const addFilesFromFilepathsToZip = (
  folder: JSZip,
  folderNode: FolderTreeFolder,
  files: Record<string, string>,
) => {
  folderNode.children.forEach((child) => {
    if (child.type === 'file') {
      const file = files[child.id]
      if (typeof file === 'string') {
        folder.file(child.name, createReadStream(file))
      } else {
        folder.file(child.name, file)
      }
    } else if (child.type === 'folder') {
      const subFolder = folder.folder(child.name)
      if (!subFolder) {
        throw new Error('Failed to create folder in zip')
      }
      addFilesFromFilepathsToZip(subFolder, child as FolderTreeFolder, files)
    }
  })
}

export const constructZipFromTreeAndFileSystemPaths = async (
  tree: FolderTree,
  files: Record<string, string>,
) => {
  if (tree.type === 'file') {
    throw new Error('Cannot construct zip from file')
  }

  const zip = new JSZip()
  addFilesFromFilepathsToZip(zip, tree as FolderTreeFolder, files)

  return zip.generateAsync({ type: 'blob' })
}
