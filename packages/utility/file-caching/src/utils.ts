import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { v4 } from 'uuid'

export const writeFile = async (
  filepath: string,
  data: AsyncIterable<Buffer>,
  ensureDirectoryExistance: boolean = true,
) => {
  const tempFilePath = path.join(path.dirname(filepath), `${v4()}.tmp`)

  if (ensureDirectoryExistance) {
    await asyncEnsureDirectoryExists(path.dirname(tempFilePath))
  }

  await fsPromises.writeFile(tempFilePath, data)
  await fsPromises.rename(tempFilePath, filepath)
}

export const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export const asyncEnsureDirectoryExists = async (dir: string) => {
  const exists = await fsPromises
    .access(dir)
    .then(() => true)
    .catch(() => false)

  if (!exists) {
    await fsPromises.mkdir(dir, { recursive: true })
  }
  return dir
}
