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
import { asyncByChunk, asyncFromStream, fileToIterable } from '../utils/async.js'
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
import { GenericFile } from './models/file.js'
import {
  constructFromFileSystemEntries,
  constructFromInput,
  constructZipBlobFromTreeAndPaths,
} from './models/folderTree.js'

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
 * @returns {Promise<CID>} - A promise that resolves with the CID of the uploaded file.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadFileFromFilepath = async (
  api: AutoDriveApi,
  filePath: string,
  { password, compression = true }: UploadFileOptions,
  uploadChunkSize?: number,
): Promise<CID> => {
  const name = filePath.split('/').pop()!

  return uploadFileFromInput(
    api,
    {
      read: () => fs.createReadStream(filePath),
      name,
      mimeType: mime.lookup(name) || undefined,
      size: fs.statSync(filePath).size,
      path: filePath,
    },
    {
      password,
      compression,
    },
    uploadChunkSize,
  )
}

/**
 * Uploads a file to the server with optional encryption and compression.
 *
 * This function reads a file from the specified file path, optionally encrypts it
 * using the provided password, and compresses it using the specified algorithm if requested.
 * It then uploads the file in chunks to the server, creating an upload session and
 * completing it once all chunks have been uploaded.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {AsyncIterable<Buffer>} asyncIterable - The file to be uploaded as an async iterable.
 * @param {UploadFileOptions} options - Options for the upload process.
 * @param {string} [options.password] - The password for encryption (optional).
 * @param {boolean} [options.compression=true] - Whether to compress the file (optional).
 * @returns {Promise<CID>} - A promise that resolves with the CID of the uploaded file.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadFileFromInput = async (
  api: AutoDriveApi,
  file: File | GenericFile,
  { password, compression = true }: UploadFileOptions,
  uploadChunkSize?: number,
): Promise<CID> => {
  let asyncIterable: AsyncIterable<Buffer> =
    file instanceof File ? fileToIterable(file) : file.read()

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
    mimeType: mime.lookup(file.name) || undefined,
    filename: file.name,
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
export const uploadFolderFromFolderPath = async (
  api: AutoDriveApi,
  folderPath: string,
  { uploadChunkSize, password }: { uploadChunkSize?: number; password?: string } = {},
): Promise<CID> => {
  const files = await getFiles(folderPath)
  const fileTree = constructFromFileSystemEntries(files)

  if (password) {
    const filesMap = Object.fromEntries(files.map((file) => [file, file]))
    const zipBlob = await constructZipBlobFromTreeAndPaths(fileTree, filesMap)
    const name = folderPath.split('/').pop()!
    const fileUpload = await uploadFileFromInput(
      api,
      {
        read: () => fileToIterable(zipBlob),
        name,
        mimeType: 'application/zip',
        size: zipBlob.size,
        path: name,
      },
      {
        password,
        compression: true,
      },
    )
    return fileUpload
  }

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
    const filename = file.split('/').pop()!
    await uploadFileWithinFolderUpload(
      api,
      folderUpload.id,
      {
        read: () => fs.createReadStream(file),
        name: filename,
        mimeType: mime.lookup(filename) || undefined,
        size: fs.statSync(file).size,
        path: file,
      },
      uploadChunkSize,
    )
  }

  const result = await completeUpload(api, { uploadId: folderUpload.id })

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
export const uploadFolderFromInput = async (
  api: AutoDriveApi,
  fileList: FileList | File[],
  { uploadChunkSize, password }: { uploadChunkSize?: number; password?: string } = {},
): Promise<CID> => {
  const files = fileList instanceof FileList ? Array.from(fileList) : fileList
  const fileTree = constructFromInput(files)

  // If password is provided, we zip the files and upload the zip file
  if (password) {
    const filesMap: Record<string, File> = Object.fromEntries(
      files.map((file) => [file.webkitRelativePath, file]),
    )
    const zipBlob = await constructZipBlobFromTreeAndPaths(fileTree, filesMap)
    const name = fileList[0].webkitRelativePath.split('/').filter(Boolean)[0]!

    const fileUpload = await uploadFileFromInput(
      api,
      {
        read: () => fileToIterable(zipBlob),
        name: `${name}.zip`,
        mimeType: 'application/zip',
        size: zipBlob.size,
        path: name,
      },
      {
        password,
        compression: true,
      },
    )
    return fileUpload
  }

  // Otherwise, we upload the files as a folder w/o compression or encryption
  const folderUpload = await createFolderUpload(api, {
    fileTree,
  })
  for (const file of files) {
    await uploadFileWithinFolderUpload(
      api,
      folderUpload.id,
      {
        read: () => fileToIterable(file),
        name: file.name,
        mimeType: mime.lookup(file.name) || undefined,
        size: file.size,
        path: file.webkitRelativePath,
      },
      uploadChunkSize,
    )
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
  file: GenericFile,
  uploadChunkSize?: number,
): Promise<CID> => {
  const fileUpload = await createFileUploadWithinFolderUpload(api, {
    uploadId,
    name: file.name,
    mimeType: file.mimeType,
    relativeId: file.path,
    uploadOptions: {},
  })

  await uploadFileChunks(api, fileUpload.id, file.read(), uploadChunkSize)

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
