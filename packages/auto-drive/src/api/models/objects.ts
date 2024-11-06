import { OffchainMetadata } from '@autonomys/auto-dag-data'

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
