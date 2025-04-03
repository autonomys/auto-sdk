import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'

export const writeFile = async (
  filepath: string,
  data: AsyncIterable<Buffer>,
  ensureDirectoryExistance: boolean = true,
) => {
  const tempFilePath = `${filepath}.tmp`

  if (ensureDirectoryExistance) {
    await fsPromises.mkdir(path.dirname(tempFilePath), { recursive: true })
  }

  await fsPromises.writeFile(tempFilePath, data)
  await fsPromises.rename(tempFilePath, filepath)
}

export const ensureDirectoryExists = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}
