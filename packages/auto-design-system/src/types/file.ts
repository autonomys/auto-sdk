import { FileUploadOptions } from '@autonomys/auto-dag-data'

export type FileData = {
  name: string
  rawData?: string
  dataArrayBuffer: ArrayBuffer
  isEncrypted: boolean
  uploadOptions: FileUploadOptions
}
