import fs from 'fs'
import mime from 'mime-types'
import { AutoDriveApi } from '../api/connection.js'
import { completeUpload, createFolderUpload } from '../api/index.js'
import { GenericFile, GenericFileWithinFolder } from '../api/models/file.js'
import { constructFromFileSystemEntries } from '../api/models/folderTree.js'
import { UploadFileStatus, UploadFolderStatus } from '../api/models/uploads.js'
import { uploadFile, UploadFileOptions, uploadFileWithinFolderUpload } from '../api/wrappers.js'
import { fileToIterable } from '../utils/index.js'
import { progressToPercentage } from '../utils/misc.js'
import { PromisedObservable } from '../utils/observable.js'
import { constructZipFromTreeAndFileSystemPaths, getFiles } from './utils.js'

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
 * @param {number} [uploadChunkSize] - The size of each chunk to upload (optional).
 * @returns {PromisedObservable<UploadFileStatus>} - An observable that emits the upload status.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadFileFromFilepath = (
  api: AutoDriveApi,
  filePath: string,
  options: UploadFileOptions = {},
  uploadChunkSize?: number,
): PromisedObservable<UploadFileStatus> => {
  const { password = undefined, compression = true } = options
  const name = filePath.split('/').pop()!

  return uploadFile(
    api,
    {
      read: () => fs.createReadStream(filePath),
      name,
      mimeType: mime.lookup(name) || undefined,
      size: fs.statSync(filePath).size,
    },
    {
      password,
      compression,
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
 * @returns {Promise<PromisedObservable<UploadFileStatus | UploadFolderStatus>>} - A promise that resolves to an observable that tracks the upload progress.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadFolderFromFolderPath = async (
  api: AutoDriveApi,
  folderPath: string,
  { uploadChunkSize, password }: { uploadChunkSize?: number; password?: string } = {},
): Promise<PromisedObservable<UploadFileStatus | UploadFolderStatus>> => {
  const files = await getFiles(folderPath)
  const fileTree = constructFromFileSystemEntries(files)

  if (password) {
    const filesMap = Object.fromEntries(files.map((file) => [file, file]))
    const zipBlob = await constructZipFromTreeAndFileSystemPaths(fileTree, filesMap)
    const name = folderPath.split('/').pop()!
    return uploadFile(
      api,
      {
        read: () => fileToIterable(zipBlob),
        name: `${name}.zip`,
        mimeType: 'application/zip',
        size: zipBlob.size,
      },
      {
        password,
        compression: true,
      },
    )
  }

  return new PromisedObservable<UploadFolderStatus>(async (subscriber) => {
    const { CompressionAlgorithm } = await import('@autonomys/auto-dag-data')
    const folderUpload = await createFolderUpload(api, {
      fileTree,
      uploadOptions: {
        compression: {
          algorithm: CompressionAlgorithm.ZLIB,
          level: 9,
        },
      },
    })

    const genericFiles: GenericFileWithinFolder[] = files.map((file) => ({
      read: () => fs.createReadStream(file),
      name: file.split('/').pop()!,
      mimeType: mime.lookup(file.split('/').pop()!) || undefined,
      size: fs.statSync(file).size,
      path: file,
    }))

    const totalSize = genericFiles.reduce((acc, file) => acc + file.size, 0)

    let progress = 0
    for (const file of genericFiles) {
      await uploadFileWithinFolderUpload(api, folderUpload.id, file, uploadChunkSize).forEach((e) =>
        subscriber.next({
          type: 'folder',
          progress: progressToPercentage(progress + e.uploadBytes, totalSize),
        }),
      )
      progress += file.size
    }

    const result = await completeUpload(api, { uploadId: folderUpload.id })

    subscriber.next({ type: 'folder', progress: 100, cid: result.cid })
    subscriber.complete()
  })
}
