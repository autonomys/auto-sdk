import mime from 'mime-types'
import { asyncByChunk, asyncFromStream, bufferToIterable, fileToIterable } from '../utils/async'
import { progressToPercentage } from '../utils/misc'
import { apiCalls } from './calls/index'
import { AutoDriveApi } from './connection'
import { GenericFile, GenericFileWithinFolder } from './models/file'
import { constructFromInput, constructZipBlobFromTreeAndPaths } from './models/folderTree'

export type UploadFileOptions = {
  password?: string
  compression?: boolean
  onProgress?: (progress: number) => void
}

const UPLOAD_FILE_CHUNK_SIZE = 1024 * 1024

const uploadFileChunks = (
  api: AutoDriveApi,
  fileUploadId: string,
  asyncIterable: AsyncIterable<Buffer>,
  uploadChunkSize: number = UPLOAD_FILE_CHUNK_SIZE,
  onProgress?: (uploadedBytes: number) => void,
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      let index = 0
      let uploadBytes = 0
      for await (const chunk of asyncByChunk(asyncIterable, uploadChunkSize)) {
        await apiCalls.uploadFileChunk(api, { uploadId: fileUploadId, chunk, index })
        uploadBytes += chunk.length
        onProgress?.(uploadBytes)
        index++
      }

      resolve()
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Uploads a file to the server with optional encryption and compression.
 *
 * This function reads a file from the provided input, optionally encrypts it
 * using the specified password, and compresses it using the specified algorithm if requested.
 * It uploads the file in chunks to the server, creating an upload session and
 * completing it once all chunks have been successfully uploaded.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {File} file - The file to be uploaded.
 * @param {UploadFileOptions} options - Options for the upload process.
 * @param {string} [options.password] - The password for encryption (optional).
 * @param {boolean} [options.compression=true] - Whether to compress the file (optional).
 * @param {number} [uploadChunkSize] - The size of each chunk to upload (optional).
 * @returns {PromisedObservable<UploadFileStatus>} - An observable that emits the upload status.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadFileFromInput = (
  api: AutoDriveApi,
  file: File,
  options: UploadFileOptions = {},
  uploadChunkSize?: number,
): Promise<string> => {
  const { password = undefined, compression = true } = options
  return new Promise(async (resolve, reject) => {
    const { compressFile, CompressionAlgorithm, encryptFile, EncryptionAlgorithm } = await import(
      '@autonomys/auto-dag-data'
    )
    let asyncIterable: AsyncIterable<Buffer> = fileToIterable(file)

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
    const fileUpload = await apiCalls.createFileUpload(api, {
      mimeType: mime.lookup(file.name) || undefined,
      filename: file.name,
      uploadOptions,
    })

    await uploadFileChunks(api, fileUpload.id, asyncIterable, uploadChunkSize, (bytes) => {
      options.onProgress?.(progressToPercentage(bytes, file.size))
    })

    const result = await apiCalls.completeUpload(api, { uploadId: fileUpload.id })

    resolve(result.cid)
  })
}

/**
 * Uploads a file to the server with optional encryption and compression.
 *
 * This function reads a file from the provided input, optionally encrypts it
 * using the specified password, and compresses it using the specified algorithm if requested.
 * It uploads the file in chunks to the server, creating an upload session and
 * completing it once all chunks have been successfully uploaded.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {File | GenericFile} file - The file to be uploaded, which can be a File or a GenericFile.
 * @param {UploadFileOptions} options - Options for the upload process.
 * @param {string} [options.password] - The password for encryption (optional).
 * @param {boolean} [options.compression=true] - Whether to compress the file (optional).
 * @param {number} [uploadChunkSize] - The size of each chunk to upload (optional).
 * @returns {Promise<string>} - The CID of the uploaded file.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadFile = async (
  api: AutoDriveApi,
  file: GenericFile,
  options: UploadFileOptions = {},
  uploadChunkSize?: number,
): Promise<string> => {
  const { password = undefined, compression = true } = options

  const { compressFile, CompressionAlgorithm, encryptFile, EncryptionAlgorithm } = await import(
    '@autonomys/auto-dag-data'
  )
  let asyncIterable: AsyncIterable<Buffer> = file.read()

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
  const fileUpload = await apiCalls.createFileUpload(api, {
    mimeType: mime.lookup(file.name) || undefined,
    filename: file.name,
    uploadOptions,
  })

  await uploadFileChunks(api, fileUpload.id, asyncIterable, uploadChunkSize, (bytes) => {
    options.onProgress?.(progressToPercentage(bytes, file.size))
  })

  const result = await apiCalls.completeUpload(api, { uploadId: fileUpload.id })

  return result.cid
}

/**
 * Uploads an object as a JSON file to the server.
 *
 * This function serializes the provided object to a JSON string,
 * and then uploads the JSON string as a file to the server.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {File | GenericFile} file - The file to be uploaded, which can be a File or a GenericFile.
 * @param {UploadFileOptions} options - Options for the upload process.
 * @param {string} [options.password] - The password for encryption (optional).
 * @param {boolean} [options.compression=true] - Whether to compress the file (optional).
 * @param {number} [uploadChunkSize] - The size of each chunk to upload (optional).
 * @returns {Promise<string>} - The CID of the uploaded file.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadObjectAsJSON = async (
  api: AutoDriveApi,
  object: unknown,
  name?: string | undefined,
  options: UploadFileOptions = {},
  uploadChunkSize?: number,
): Promise<string> => {
  try {
    const json = Buffer.from(JSON.stringify(object))
    return uploadFile(
      api,
      {
        read: () => bufferToIterable(json),
        name: name || 'object.json',
        mimeType: 'application/json',
        size: json.length,
      },
      options,
      uploadChunkSize,
    )
  } catch (e) {
    throw new Error('Failed to serialize object to JSON')
  }
}

/**
 * Uploads an entire folder to the server.
 *
 * This function retrieves all files within the specified folder,
 * constructs a file tree representation, and initiates the upload
 * process. It also handles optional compression of the files during
 * the upload. If a password is provided, the files will be zipped
 * before uploading.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {FileList | File[]} fileList - The list of files to be uploaded.
 * @param {Object} options - Options for the upload process.
 * @param {number} [options.uploadChunkSize] - The size of each chunk to upload (optional).
 * @param {string} [options.password] - The password for encryption (optional).
 * @returns {PromisedObservable<UploadFileStatus | UploadFolderStatus>} - An observable that emits the upload status.
 * @throws {Error} - Throws an error if the upload fails at any stage.
 */
export const uploadFolderFromInput = async (
  api: AutoDriveApi,
  fileList: FileList | File[],
  {
    uploadChunkSize,
    password,
    onProgress,
  }: { uploadChunkSize?: number; password?: string; onProgress?: (progress: number) => void } = {},
): Promise<string> => {
  const files = fileList instanceof FileList ? Array.from(fileList) : fileList
  const fileTree = constructFromInput(files)

  // If password is provided, we zip the files and upload the zip file
  if (password) {
    const filesMap: Record<string, File> = Object.fromEntries(
      files.map((file) => [file.webkitRelativePath, file]),
    )
    const zipBlob = await constructZipBlobFromTreeAndPaths(fileTree, filesMap)
    const name = fileList[0].webkitRelativePath.split('/').filter(Boolean)[0]!

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
        onProgress,
      },
    )
  }

  // Otherwise, we upload the files as a folder w/o compression or encryption
  const folderUpload = await apiCalls.createFolderUpload(api, {
    fileTree,
  })

  let currentBytesUploaded = 0
  const totalSize = files.reduce((acc, file) => acc + file.size, 0)
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
      {
        onProgress: (progress) => {
          onProgress?.(progressToPercentage(currentBytesUploaded + progress, totalSize))
        },
      },
    )
    currentBytesUploaded += file.size
  }

  const result = await apiCalls.completeUpload(api, { uploadId: folderUpload.id })

  return result.cid
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
  file: GenericFileWithinFolder,
  uploadChunkSize?: number,
  options: Pick<UploadFileOptions, 'onProgress'> = {},
): Promise<string> => {
  const fileUpload = await apiCalls.createFileUploadWithinFolderUpload(api, {
    uploadId,
    name: file.name,
    mimeType: file.mimeType,
    relativeId: file.path,
    uploadOptions: {},
  })

  await uploadFileChunks(api, fileUpload.id, file.read(), uploadChunkSize, options.onProgress)

  const result = await apiCalls.completeUpload(api, { uploadId: fileUpload.id })

  return result.cid
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
  const { decompressFile, CompressionAlgorithm, EncryptionAlgorithm, decryptFile } = await import(
    '@autonomys/auto-dag-data'
  )

  const metadata = await apiCalls.getObjectMetadata(api, { cid })

  let iterable = asyncFromStream(await apiCalls.downloadObject(api, { cid }))
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
