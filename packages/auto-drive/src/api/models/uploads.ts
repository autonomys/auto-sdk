import { z } from 'zod'
import { AutoCID } from '../../utils/autohash'
import { FolderTreeFolderSchema } from './folderTree'

export enum UploadType {
  FILE = 'file',
  FOLDER = 'folder',
}

export enum UploadStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  MIGRATING = 'migrating',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export const fileUploadSchema = z.object({
  id: z.string(),
  rootId: z.string(),
  relativeId: z.string().nullable(),
  type: z.nativeEnum(UploadType),
  status: z.nativeEnum(UploadStatus),
  fileTree: z.null(),
  name: z.string(),
  mimeType: z.string().nullable(),
  oauthProvider: z.string(),
  oauthUserId: z.string(),
})

export enum CompressionAlgorithm {
  ZLIB = 'ZLIB',
}
export interface CompressionOptions {
  algorithm: CompressionAlgorithm
  level?: number
  chunkSize?: number
}

export type FileUploadOptions = {
  compression?: CompressionOptions
  encryption?: EncryptionOptions
}

export enum EncryptionAlgorithm {
  AES_256_GCM = 'AES_256_GCM',
}

export interface EncryptionOptions {
  algorithm: EncryptionAlgorithm
  chunkSize?: number
}

export type FileUpload = z.infer<typeof fileUploadSchema> & {
  uploadOptions: FileUploadOptions | null
}

export const folderUploadSchema = z.object({
  id: z.string(),
  rootId: z.string(),
  relativeId: z.string().nullable(),
  type: z.nativeEnum(UploadType),
  status: z.nativeEnum(UploadStatus),
  fileTree: FolderTreeFolderSchema,
  name: z.string(),
  mimeType: z.null(),
  oauthProvider: z.string(),
  oauthUserId: z.string(),
  uploadOptions: z.null(),
})

export type FolderUpload = z.infer<typeof folderUploadSchema>

export type CompleteUploadResponse = {
  cid: string
}

type ObjectUploadStatus<Type extends 'file' | 'folder'> =
  | {
      completed: true
      type: Type
      progress: number
      cid: AutoCID
    }
  | {
      completed: false
      type: Type
      progress: number
      cid: null
    }

export type UploadFileStatus = ObjectUploadStatus<'file'>
export type UploadFolderStatus = ObjectUploadStatus<'folder'>

export type UploadChunksStatus = {
  uploadBytes: number
}
