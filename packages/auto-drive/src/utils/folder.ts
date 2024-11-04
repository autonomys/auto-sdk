import fs from 'fs/promises'
import path from 'path'

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
