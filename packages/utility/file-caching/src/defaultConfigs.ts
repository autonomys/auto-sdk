import { stringify } from '@autonomys/auto-utils'
import KeyvSqlite from '@keyvhq/sqlite'
import Keyv from 'keyv'
import { LRUCache } from 'lru-cache'
import path from 'path'
import { ensureDirectoryExists } from './utils'

export const defaultMemoryAndSqliteConfig = ({
  dirname,
  cacheMaxSize,
  cacheTtl,
}: {
  dirname: string
  cacheMaxSize: number
  cacheTtl: number
}) => {
  const cacheDir = ensureDirectoryExists(path.join(dirname, 'files'))

  return {
    cacheDir,
    pathPartitions: 3,
    stores: [
      new Keyv({
        serialize: stringify,
        store: new LRUCache<string, string>({
          maxSize: cacheMaxSize,
          maxEntrySize: Number.MAX_SAFE_INTEGER,
          sizeCalculation: (value) => {
            const { value: parsedValue } = JSON.parse(value)
            return Number(parsedValue?.size ?? 0)
          },
        }),
      }),
      new Keyv({
        store: new KeyvSqlite({
          uri: path.join(cacheDir, 'files.sqlite'),
        }),
        ttl: cacheTtl,
        serialize: stringify,
      }),
    ],
  }
}

export const defaultInitMemoryConfig = ({
  dirname,
  cacheMaxSize,
}: {
  dirname: string
  cacheMaxSize: number
}) => {
  const cacheDir = ensureDirectoryExists(path.join(dirname, 'files'))

  return {
    cacheDir,
    pathPartitions: 3,
    stores: [
      new Keyv({
        serialize: stringify,
        store: new LRUCache<string, string>({
          maxSize: cacheMaxSize,
          maxEntrySize: Number.MAX_SAFE_INTEGER,
          sizeCalculation: (value) => {
            const { value: parsedValue } = JSON.parse(value)
            return Number(parsedValue?.size ?? 0)
          },
        }),
      }),
    ],
  }
}
