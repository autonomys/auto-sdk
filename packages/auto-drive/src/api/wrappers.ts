/* eslint-disable no-async-promise-executor */
import {
  asyncByChunk,
  asyncFromStream,
  bufferToIterable,
  fileToIterable,
} from '@autonomys/asynchronous'
import mime from 'mime-types'
import { progressToPercentage } from '../utils/misc'
import { publicDownloadUrl } from './calls/download'
import { apiCalls } from './calls/index'
import { ObjectSummary, Scope } from './models'
import { PaginatedResult } from './models/common'
import { GenericFile, GenericFileWithinFolder } from './models/file'
import { constructFromInput, constructZipBlobFromTreeAndPaths } from './models/folderTree'
import { SubscriptionInfo } from './models/user'
import { AutoDriveApi, AutoDriveApiHandler, UploadFileOptions } from './types'

const UPLOAD_FILE_CHUNK_SIZE = 1024 * 1024

const uploadFileChunks = (
  api: AutoDriveApiHandler,
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

export const createApiInterface = (api: AutoDriveApiHandler): AutoDriveApi => {
  const uploadFileFromInput = (
    file: File,
    options: UploadFileOptions = {},
    uploadChunkSize?: number,
  ): Promise<string> => {
    const { password = undefined, compression = true } = options
    return new Promise(async (resolve) => {
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

  const uploadFile = async (
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

  const uploadObjectAsJSON = async (
    object: unknown,
    name?: string | undefined,
    options: UploadFileOptions = {},
    uploadChunkSize?: number,
  ): Promise<string> => {
    try {
      const json = Buffer.from(JSON.stringify(object))
      return uploadFile(
        {
          read: () => bufferToIterable(json),
          name: name || 'object.json',
          mimeType: 'application/json',
          size: json.length,
        },
        options,
        uploadChunkSize,
      )
    } catch {
      throw new Error('Failed to serialize object to JSON')
    }
  }

  const uploadFolderFromInput = async (
    fileList: FileList | File[],
    {
      uploadChunkSize,
      password,
      onProgress,
    }: {
      uploadChunkSize?: number
      password?: string
      onProgress?: (progress: number) => void
    } = {},
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

  const uploadFileWithinFolderUpload = async (
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

  const downloadFile = async (cid: string, password?: string): Promise<AsyncIterable<Buffer>> => {
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

  const getPendingCredits = async (): Promise<{ upload: number; download: number }> => {
    const me = await apiCalls.getMe(api)
    return {
      upload: me.subscription.pendingUploadCredits,
      download: me.subscription.pendingDownloadCredits,
    }
  }

  const getSubscriptionInfo = async (): Promise<SubscriptionInfo> => {
    const me = await apiCalls.getMe(api)

    return me.subscription
  }

  const publishObject = async (cid: string): Promise<string> => {
    const result = await apiCalls.publishObject(api, { cid })

    return publicDownloadUrl(api, result.result)
  }

  const getMyFiles = async (
    page: number,
    limit: number = 100,
  ): Promise<PaginatedResult<ObjectSummary>> => {
    const result = await apiCalls.getRoots(api, {
      scope: Scope.User,
      limit,
      offset: page * limit,
    })

    return result
  }

  const searchByNameOrCIDInMyFiles = async (value: string): Promise<ObjectSummary[]> => {
    const results = await apiCalls.searchByNameOrCID(api, { value, scope: Scope.User })

    const summaries = await Promise.all(
      results.map(async (e) => apiCalls.getObjectSummary(api, { cid: e.cid })),
    )

    return summaries
  }

  const searchByNameOrCID = async (value: string): Promise<ObjectSummary[]> => {
    const results = await apiCalls.searchByNameOrCID(api, { value, scope: Scope.Global })

    const summaries = await Promise.all(
      results.map(async (e) => apiCalls.getObjectSummary(api, { cid: e.cid })),
    )

    return summaries
  }

  const me = () => apiCalls.getMe(api)

  return {
    me,
    uploadFileFromInput,
    uploadFile,
    uploadObjectAsJSON,
    uploadFolderFromInput,
    uploadFileWithinFolderUpload,
    downloadFile,
    getPendingCredits,
    getSubscriptionInfo,
    publishObject,
    getMyFiles,
    searchByNameOrCIDInMyFiles,
    searchByNameOrCID,
    sendRequest: api.sendRequest,
    baseUrl: api.baseUrl,
  }
}
