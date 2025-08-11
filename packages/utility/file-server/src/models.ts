import { IPLDNodeData, MetadataType, OffchainMetadata } from '@autonomys/auto-dag-data'
import { Keyv } from 'keyv'
import { Readable } from 'stream'
import { inferMimeType } from './utils.js'

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

export type ByteRange = [number, number | undefined]

export interface FileCacheOptions {
  byteRange?: ByteRange
}

export type DownloadMetadata = {
  name: string
  type: OffchainMetadata['type']
  mimeType?: string
  size?: bigint
  isEncrypted: boolean
  isCompressed: boolean
}

export type DownloadOptions = {
  byteRange?: ByteRange
  rawMode?: boolean
}

export class DownloadMetadataFactory {
  static fromOffchainMetadata(metadata: OffchainMetadata): DownloadMetadata {
    return {
      size: metadata.totalSize,
      isEncrypted: !!metadata.uploadOptions?.encryption?.algorithm,
      isCompressed: !!metadata.uploadOptions?.compression?.algorithm,
      name: metadata.name ?? 'download',
      type: metadata.type,
      mimeType:
        metadata.type === 'file'
          ? (metadata.mimeType ?? 'application/octet-stream')
          : 'application/zip',
    }
  }

  static fromIPLDData(data: IPLDNodeData): DownloadMetadata {
    const type = [MetadataType.File, MetadataType.FileChunk, MetadataType.FileInlink].includes(
      data.type,
    )
      ? 'file'
      : 'folder'

    const name = data.name ?? 'download'
    const mimeType = inferMimeType(name)

    return {
      size: data.size,
      isEncrypted: !!data.uploadOptions?.encryption?.algorithm,
      isCompressed: !!data.uploadOptions?.compression?.algorithm,
      name,
      type,
      mimeType,
    }
  }
}
