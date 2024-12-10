import { FileUploadOptions } from './uploads'

export type OffchainMetadata = OffchainFileMetadata | OffchainFolderMetadata
interface ChildrenMetadata {
  type: 'folder' | 'file'
  name?: string
  cid: string
  totalSize: bigint
}

export type OffchainFolderMetadata = {
  type: 'folder'
  dataCid: string
  name?: string
  totalSize: bigint
  totalFiles: number
  children: ChildrenMetadata[]
  uploadOptions: FileUploadOptions
}

export type OffchainFileMetadata = {
  type: 'file'
  dataCid: string
  name?: string
  mimeType?: string
  totalSize: bigint
  totalChunks: number
  chunks: ChunkInfo[]
  uploadOptions?: FileUploadOptions
}

export interface ChunkInfo {
  size: bigint
  cid: string
}

export enum Scope {
  Global = 'global',
  User = 'user',
}

export interface Owner {
  publicId: string
  role: OwnerRole
}

export enum OwnerRole {
  ADMIN = 'admin',
  VIEWER = 'viewer',
}

export interface ObjectUploadStatus {
  uploadedNodes: number | null
  totalNodes: number | null
  minimumBlockDepth: number | null
  maximumBlockDepth: number | null
}

export type ObjectSummary = {
  headCid: string
  name?: string
  size: number
  owners: Owner[]
  uploadStatus: ObjectUploadStatus
} & (
  | {
      type: 'file'
      mimeType?: string
    }
  | {
      type: 'folder'
      children: (OffchainMetadata & { type: 'folder' })['children']
    }
)

export interface ObjectInformation {
  cid: string
  metadata: OffchainMetadata
  uploadStatus: ObjectUploadStatus
  owners: Owner[]
}
