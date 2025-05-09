import { Keyv } from 'keyv'
import { Readable } from 'stream'

export type FileResponse = {
  data: Readable
  mimeType?: string
  filename?: string
  size?: bigint
  encoding?: string
}

export interface BaseCacheConfig {
  pathPartitions: number
  cacheDir: string
  stores: Keyv<FileResponse>[]
}

export interface FileCache {
  get: (cid: string) => Promise<Buffer | Readable | null>
  set: (cid: string, data: Buffer | Readable) => Promise<void>
  remove: (cid: string) => Promise<void>
}
