import {
  compressFile,
  CompressionAlgorithm,
  encryptFile,
  EncryptionAlgorithm,
} from '@autonomys/auto-dag-data'
import fs from 'fs'
import mime from 'mime-types'
import { asyncByChunk } from '../utils/async.js'
import { getFiles } from '../utils/folder.js'
import {
  completeUpload,
  createFileUpload,
  createFileUploadWithinFolderUpload,
  createFolderUpload,
  uploadFileChunk,
} from './calls/index.js'
import { AutoDriveApi } from './connection.js'
import { constructFromFileSystemEntries } from './models/folderTree.js'

type UploadFileOptions = {
  password?: string
  compression?: boolean
}

const uploadFileChunks = async (
  api: AutoDriveApi,
  fileUploadId: string,
  asyncIterable: AsyncIterable<Buffer>,
) => {
  let index = 0
  for await (const chunk of asyncByChunk(asyncIterable, 1024 * 1024)) {
    await uploadFileChunk(api, { uploadId: fileUploadId, chunk, index })
    index++
  }
}

/**
 * Uploads a file to the server with optional encryption and compression.
 *
 * This function reads a file from the specified file path, optionally encrypts it
 * using the provided password, and compresses it using the ZLIB algorithm if specified.
 * It then uploads the file in chunks to the server, creating an upload session and
 * completing it once all chunks have been uploaded.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {string} filePath - The path to the file to be uploaded.
 * @param {UploadFileOptions} options - Options for the upload process.
 * @param {string} [options.password] - The password for encryption (optional).
 * @param {boolean} [options.compression=true] - Whether to compress the file (optional).
 * @returns {Promise<void>} - A promise that resolves when the upload is complete.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadFile = async (
  api: AutoDriveApi,
  filePath: string,
  { password, compression = true }: UploadFileOptions,
) => {
  let asyncIterable: AsyncIterable<Buffer> = fs.createReadStream(filePath)

  if (compression) {
    asyncIterable = compressFile(asyncIterable, {
      level: 9,
      algorithm: CompressionAlgorithm.ZLIB,
    })
  }

  if (password) {
    asyncIterable = encryptFile(asyncIterable, password, {
      algorithm: EncryptionAlgorithm.AES_256_GCM,
    })
  }

  const uploadOptions = {
    compression: compression
      ? {
          level: 9,
          algorithm: CompressionAlgorithm.ZLIB,
        }
      : undefined,
    encryption: password
      ? {
          algorithm: EncryptionAlgorithm.AES_256_GCM,
        }
      : undefined,
  }
  const fileUpload = await createFileUpload(api, {
    mimeType: mime.lookup(filePath) || undefined,
    filename: filePath.split('/').pop()!,
    uploadOptions,
  })

  await uploadFileChunks(api, fileUpload.id, asyncIterable)

  await completeUpload(api, { uploadId: fileUpload.id })
}

/**
 * Uploads an entire folder to the server.
 *
 * This function retrieves all files within the specified folder,
 * constructs a file tree representation, and initiates the upload
 * process. It also handles optional compression of the files during
 * the upload.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {string} folderPath - The path of the folder to be uploaded.
 * @returns {Promise<void>} - A promise that resolves when the folder upload is complete.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadFolder = async (api: AutoDriveApi, folderPath: string) => {
  const files = await getFiles(folderPath)

  const fileTree = constructFromFileSystemEntries(files)

  const folderUpload = await createFolderUpload(api, {
    fileTree,
    uploadOptions: {
      compression: {
        algorithm: CompressionAlgorithm.ZLIB,
        level: 9,
      },
    },
  })

  for (const file of files) {
    await uploadFile(api, file, {
      compression: true,
    })
  }

  await completeUpload(api, { uploadId: folderUpload.id })
}

/**
 * Uploads a file within an existing folder upload session.
 *
 * @param {AutoDriveApi} api - The API instance to interact with the AutoDrive service.
 * @param {string} uploadId - The ID of the folder upload session to which the file will be added.
 * @param {string} filepath - The path of the file to be uploaded.
 *
 * @returns {Promise<void>} A promise that resolves when the file upload is complete.
 */
export const uploadFileWithinFolderUpload = async (
  api: AutoDriveApi,
  uploadId: string,
  filepath: string,
) => {
  const name = filepath.split('/').pop()!
  const fileUpload = await createFileUploadWithinFolderUpload(api, {
    uploadId,
    name,
    mimeType: mime.lookup(name) || undefined,
    relativeId: filepath,
    uploadOptions: {},
  })

  await uploadFileChunks(api, fileUpload.id, fs.createReadStream(filepath))

  await completeUpload(api, { uploadId: fileUpload.id })
}
