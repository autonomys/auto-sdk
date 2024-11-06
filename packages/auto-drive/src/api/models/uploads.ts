import { FileUploadOptions } from '@autonomys/auto-dag-data'
import { z } from 'zod'
import { FolderTreeFolderSchema } from './folderTree.ts'

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
