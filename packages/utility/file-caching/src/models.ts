import { Keyv } from 'keyv'
import { Stream } from 'stream'

export type FileResponse = {
  data: Stream
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
  get: (cid: string) => Promise<Buffer | Stream | null>
  set: (cid: string, data: Buffer | Stream) => Promise<void>
  remove: (cid: string) => Promise<void>
}
