import { fileToIterable } from '@autonomys/asynchronous'
import fs from 'fs'
import path from 'path'
import { apiCalls } from '../api/index'
import { GenericFileWithinFolder } from '../api/models/file'
import { constructFromFileSystemEntries } from '../api/models/folderTree'
import { CompressionAlgorithm } from '../api/models/uploads'
import { AutoDriveApi, UploadFileOptions, UploadFolderOptions } from '../api/types'
import { assertValidCustomerReference } from '../utils/customerReference'
import { lookupMimeType } from '../utils/mimeType'
import { progressToPercentage } from '../utils/misc'
import { constructZipFromTreeAndFileSystemPaths, getFiles } from './utils'

const toPosixPath = (filePath: string): string =>
  path.sep === '\\' ? filePath.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/') : filePath

/**
 * Uploads a file to the server with optional encryption and compression.
 *
 * This function reads a file from the specified file path, optionally encrypts it
 * using the provided password, and compresses it using the specified algorithm if requested.
 * It then uploads the file in chunks to the server, creating an upload session and
 * completing it once all chunks have been successfully uploaded.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {string} filePath - The path to the file to be uploaded.
 * @param {UploadFileOptions} options - Options for the upload process.
 * @param {string} [options.password] - The password for encryption (optional).
 * @param {boolean} [options.compression=true] - Whether to compress the file (optional).
 * @param {string} [options.customerReference] - Your reference for the customer the upload is for (optional).
 * @param {number} [uploadChunkSize] - The size of each chunk to upload (optional).
 * @returns {PromisedObservable<UploadFileStatus>} - An observable that emits the upload status.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadFileFromFilepath = (
  api: AutoDriveApi,
  filePath: string,
  options: UploadFileOptions = {},
  uploadChunkSize?: number,
): Promise<string> => {
  const { password = undefined, compression = true, onProgress, customerReference } = options
  const name = path.posix.basename(toPosixPath(filePath))

  return api.uploadFile(
    {
      read: () => fs.createReadStream(filePath),
      name,
      mimeType: lookupMimeType(name),
      size: fs.statSync(filePath).size,
    },
    {
      password,
      compression,
      onProgress,
      customerReference,
    },
    uploadChunkSize,
  )
}

/**
 * Uploads an entire folder to the server.
 *
 * This function retrieves all files within the specified folder,
 * constructs a file tree representation, and initiates the upload
 * process. It also handles optional compression and encryption of the files during
 * the upload.
 *
 * If a password is provided, the files will be zipped before uploading.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {string} folderPath - The path of the folder to be uploaded.
 * @param {Object} options - Optional parameters for the upload.
 * @param {number} [options.uploadChunkSize] - The size of each chunk to be uploaded.
 * @param {string} [options.password] - An optional password for encrypting the files.
 * @param {string} [options.customerReference] - Your reference for the customer the upload is for (optional).
 * @returns {Promise<PromisedObservable<UploadFileStatus | UploadFolderStatus>>} - A promise that resolves to an observable that tracks the upload progress.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadFolderFromFolderPath = async (
  api: AutoDriveApi,
  folderPath: string,
  { uploadChunkSize, password, onProgress, customerReference }: UploadFolderOptions = {},
): Promise<Promise<string>> => {
  if (password === '') {
    throw new Error('Password cannot be empty')
  }
  // Checked here as well because an encrypted folder is zipped before its upload is created.
  assertValidCustomerReference(customerReference)

  const files = await getFiles(folderPath)
  const fileTree = constructFromFileSystemEntries(files.map(toPosixPath))

  if (password) {
    const filesMap = Object.fromEntries(files.map((file) => [toPosixPath(file), file]))
    const zipBlob = await constructZipFromTreeAndFileSystemPaths(fileTree, filesMap)
    const name = path.posix.basename(toPosixPath(folderPath))
    return api.uploadFile(
      {
        read: () => fileToIterable(zipBlob),
        name: `${name}.zip`,
        mimeType: 'application/zip',
        size: zipBlob.size,
      },
      {
        password,
        compression: true,
        onProgress,
        customerReference,
      },
      uploadChunkSize,
    )
  }

  const folderUpload = await apiCalls.createFolderUpload(api, {
    fileTree,
    customerReference,
    uploadOptions: {
      compression: {
        algorithm: CompressionAlgorithm.ZLIB,
        level: 9,
      },
    },
  })

  const genericFiles: GenericFileWithinFolder[] = files.map((file) => {
    const normalized = toPosixPath(file)
    const name = path.posix.basename(normalized)
    return {
      read: () => fs.createReadStream(file),
      name,
      mimeType: lookupMimeType(name),
      size: fs.statSync(file).size,
      path: normalized,
    }
  })

  const totalSize = genericFiles.reduce((acc, file) => acc + file.size, 0)
  let progress = 0
  for (const file of genericFiles) {
    await api.uploadFileWithinFolderUpload(folderUpload.id, file, uploadChunkSize, {
      onProgress: (uploadedBytes) => {
        onProgress?.(progressToPercentage(progress + uploadedBytes, totalSize))
      },
    })
    progress += file.size
  }

  const result = await apiCalls.completeUpload(api, { uploadId: folderUpload.id })

  return result.cid
}
