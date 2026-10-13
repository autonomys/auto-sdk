import { createCache } from 'cache-manager'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { BaseCacheConfig, FileCacheOptions, FileResponse } from '../models.js'
import { createErrorResilientStream } from './streamUtils.js'
import { writeFile } from './utils.js'

const CHARS_PER_PARTITION = 2

type FileCacheEntry = Omit<FileResponse, 'data'>

type UncheckedFileCacheEntry = FileCacheEntry | null | undefined

export const createFileCache = (config: BaseCacheConfig) => {
  // Returns null for keys that do not map to a file inside cacheDir. Partition directories are
  // slices of the key, so a key without separators can still produce `..` path segments.
  const cidToFilePath = (cid: string): string | null => {
    if (/[/\\]/.test(cid)) {
      return null
    }

    const partitions = config.pathPartitions

    let filePath = ''
    let head = cid
    for (let i = 0; i < partitions; i++) {
      filePath = path.join(filePath, `${head.slice(-CHARS_PER_PARTITION)}/`)
      head = head.slice(0, -CHARS_PER_PARTITION)
    }
    filePath = path.join(config.cacheDir, filePath, head, cid)

    const relativePath = path.relative(config.cacheDir, filePath)
    if (relativePath === '' || relativePath.split(path.sep)[0] === '..') {
      return null
    }

    return filePath
  }

  const filepathCache = createCache({
    stores: config.stores,
    nonBlocking: false,
  })

  const deserialize = (data: UncheckedFileCacheEntry) => {
    if (!data) {
      return null
    }

    return {
      ...data,
      size: BigInt(data.size ?? 0),
    }
  }

  const get = async (cid: string, options?: FileCacheOptions): Promise<FileResponse | null> => {
    const path = cidToFilePath(cid)
    if (!path) {
      return null
    }

    const data: UncheckedFileCacheEntry = deserialize(await filepathCache.get(cid))
    if (!data) {
      return null
    }

    const sourceStream = fs.createReadStream(path, {
      start: options?.byteRange?.[0],
      end: options?.byteRange?.[1],
    })

    // Wrap with error-resilient stream for stalled stream detection
    const resilientStream = createErrorResilientStream(sourceStream, {
      stallTimeout: 30000, // 30 seconds
      healthCheckInterval: 5000, // 5 seconds
    })

    return {
      ...data,
      data: resilientStream,
    }
  }

  const has = async (cid: string): Promise<boolean> => {
    const path = cidToFilePath(cid)
    if (!path) {
      return false
    }

    return fsPromises
      .access(path, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false)
  }

  const set = async (cid: string, fileResponse: FileResponse) => {
    const filePath = cidToFilePath(cid)
    if (!filePath) {
      throw new Error(`Invalid file cache key: ${cid}`)
    }

    const { data, ...rest } = fileResponse

    await writeFile(filePath, data)

    await filepathCache.set(cid, {
      ...rest,
    })
  }

  const remove = async (cid: string) => {
    const path = cidToFilePath(cid)
    if (!path) {
      return
    }

    const data: UncheckedFileCacheEntry = deserialize(await filepathCache.get(cid))
    if (!data) {
      return
    }

    await Promise.all([filepathCache.del(cid), fsPromises.rm(path)])
  }

  filepathCache.on('del', async ({ key, error }) => {
    if (error) {
      console.error(`Error deleting file cache entry for ${key}: ${error}`)
    } else {
      const path = cidToFilePath(key)
      if (path) {
        await fsPromises.rm(path)
      }
    }
  })

  const cache = {
    get,
    set,
    has,
    remove,
  }

  return cache
}
