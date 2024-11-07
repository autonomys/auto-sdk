import {
  CID,
  compressFile,
  CompressionAlgorithm,
  decompressFile,
  decryptFile,
  encryptFile,
  EncryptionAlgorithm,
  stringToCid,
} from '@autonomys/auto-dag-data'
import fs from 'fs'
import mime from 'mime-types'
import { asyncByChunk, asyncFromStream } from '../utils/async.js'
import { getFiles } from '../utils/folder.js'
import {
  completeUpload,
  createFileUpload,
  createFileUploadWithinFolderUpload,
  createFolderUpload,
  downloadObject,
  getObjectMetadata,
  uploadFileChunk,
} from './calls/index.js'
import { AutoDriveApi } from './connection.js'
import { constructFromFileSystemEntries } from './models/folderTree.js'

type UploadFileOptions = {
  password?: string
  compression?: boolean
}

const UPLOAD_FILE_CHUNK_SIZE = 1024 * 1024

const uploadFileChunks = async (
  api: AutoDriveApi,
  fileUploadId: string,
  asyncIterable: AsyncIterable<Buffer>,
  uploadChunkSize: number = UPLOAD_FILE_CHUNK_SIZE,
) => {
  let index = 0
  for await (const chunk of asyncByChunk(asyncIterable, uploadChunkSize)) {
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
  uploadChunkSize?: number,
): Promise<CID> => {
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

  await uploadFileChunks(api, fileUpload.id, asyncIterable, uploadChunkSize)

  const result = await completeUpload(api, { uploadId: fileUpload.id })

  return stringToCid(result.cid)
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
export const uploadFolder = async (
  api: AutoDriveApi,
  folderPath: string,
  uploadChunkSize?: number,
): Promise<CID> => {
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
    await uploadFileWithinFolderUpload(api, folderUpload.id, file, uploadChunkSize)
  }

  const result = await completeUpload(api, { uploadId: folderUpload.id })

  return stringToCid(result.cid)
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
  uploadChunkSize?: number,
): Promise<CID> => {
  const name = filepath.split('/').pop()!
  const fileUpload = await createFileUploadWithinFolderUpload(api, {
    uploadId,
    name,
    mimeType: mime.lookup(name) || undefined,
    relativeId: filepath,
    uploadOptions: {},
  })

  await uploadFileChunks(api, fileUpload.id, fs.createReadStream(filepath), uploadChunkSize)

  const result = await completeUpload(api, { uploadId: fileUpload.id })

  return stringToCid(result.cid)
}

/**
 * Downloads a file from the AutoDrive service.
 *
 * @param {AutoDriveApi} api - The API instance to interact with the AutoDrive service.
 * @param {string} cid - The CID of the file to be downloaded.
 * @returns {Promise<ReadableStream<Uint8Array>>} A promise that resolves to a ReadableStream of the downloaded file.
 */
export const downloadFile = async (
  api: AutoDriveApi,
  cid: string,
  password?: string,
): Promise<AsyncIterable<Buffer>> => {
  const metadata = await getObjectMetadata(api, { cid })

  let iterable = asyncFromStream(await downloadObject(api, { cid }))
  if (metadata.uploadOptions?.encryption) {
    if (!password) {
      throw new Error('Password is required to decrypt the file')
    }
    iterable = decryptFile(iterable, password, {
      algorithm: EncryptionAlgorithm.AES_256_GCM,
    })
  }

  if (metadata.uploadOptions?.compression) {
    iterable = decompressFile(iterable, {
      algorithm: CompressionAlgorithm.ZLIB,
    })
  }

  return iterable
}

/**
 * Downloads a folder from the AutoDrive service without encryption.
 *
 * @param {AutoDriveApi} api - The API instance to interact with the AutoDrive service.
 * @param {string} cid - The CID of the folder to be downloaded.
 *
 * @returns {Promise<ReadableStream<Uint8Array>>} A promise that resolves to a ReadableStream of the downloaded folder.
 *
 * @warning If the folder is encrypted, a warning will be logged, but the download will proceed without decryption.
 */
export const downloadFolderWithoutEncryption = async (
  api: AutoDriveApi,
  cid: string,
): Promise<ReadableStream<Uint8Array>> => {
  const metadata = await getObjectMetadata(api, { cid })
  if (metadata.uploadOptions?.encryption) {
    console.warn(
      'Downloading encrypted folder. Folder support encryption but it is not recommended.',
    )
  }

  return downloadObject(api, { cid })
}
