import { ArgsWithoutPagination } from '../../utils/types'
import { FolderTree } from '../models/folderTree'
import {
  CompleteUploadResponse,
  FileUpload,
  FileUploadOptions,
  FolderUpload,
} from '../models/uploads'
import { AutoDriveApiHandler } from '../types'
import { toApiError } from './errors'

export const CUSTOMER_REFERENCE_REGEX = /^[a-zA-Z0-9_.:-]{1,128}$/

/**
 * Validates an optional customer reference string.
 *
 * @param {string} [customerReference] - The customer reference to validate.
 * @throws {Error} - Throws an error if the customer reference is invalid.
 */
export const validateCustomerReference = (customerReference?: string): void => {
  if (customerReference === undefined) {
    return
  }

  if (typeof customerReference !== 'string' || !CUSTOMER_REFERENCE_REGEX.test(customerReference)) {
    throw new Error(
      `Invalid customer reference: "${customerReference}". Must be a string up to 128 characters containing only alphanumeric characters, '-', '_', '.', or ':'.`,
    )
  }
}

/**
 * Initiates a file upload to the server.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ mimeType?: string; filename: string; uploadOptions: FileUploadOptions | null; customerReference?: string }>} args - The arguments for the file upload.
 * @param {string} args.mimeType - The MIME type of the file (optional).
 * @param {string} args.filename - The name of the file to be uploaded.
 * @param {FileUploadOptions | null} args.uploadOptions - Additional options for the file upload (optional).
 * @param {string} [args.customerReference] - An optional client-side reference to correlate the upload.
 * @returns {Promise<FileUpload>} - A promise that resolves to the file upload information.
 * @throws {Error} - Throws an error if the upload fails or customerReference is invalid.
 */
export const createFileUpload = async (
  api: AutoDriveApiHandler,
  {
    mimeType,
    filename,
    uploadOptions = {},
    customerReference,
  }: ArgsWithoutPagination<{
    mimeType?: string
    filename: string
    uploadOptions: FileUploadOptions | null
    customerReference?: string
  }>,
): Promise<FileUpload> => {
  validateCustomerReference(customerReference)

  const headers = new Headers({
    'Content-Type': 'application/json',
  })
  if (customerReference) {
    headers.set('X-Customer-Reference', customerReference)
  }

  const response = await api.sendAPIRequest(
    '/uploads/file',
    {
      method: 'POST',
      headers,
    },
    JSON.stringify({ mimeType, filename, uploadOptions }),
  )

  if (!response.ok) {
    throw await toApiError(response, 'Failed to create file upload')
  }

  return response.json()
}

/**
 * Initiates a folder upload to the server.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ fileTree: FolderTree; uploadOptions?: FileUploadOptions; customerReference?: string }>} args - The arguments for the folder upload.
 * @param {FolderTree} args.fileTree - The structure of the folder and its contents to be uploaded.
 * @param {FileUploadOptions} [args.uploadOptions] - Additional options for the folder upload.
 * @param {string} [args.customerReference] - An optional client-side reference to correlate the upload.
 * @returns {Promise<FolderUpload>} - A promise that resolves to the folder upload information.
 * @throws {Error} - Throws an error if the upload fails or customerReference is invalid.
 */
export const createFolderUpload = async (
  api: AutoDriveApiHandler,
  {
    fileTree,
    uploadOptions = {},
    customerReference,
  }: ArgsWithoutPagination<{
    fileTree: FolderTree
    uploadOptions?: FileUploadOptions
    customerReference?: string
  }>,
): Promise<FolderUpload> => {
  validateCustomerReference(customerReference)

  const headers = new Headers({
    'Content-Type': 'application/json',
  })
  if (customerReference) {
    headers.set('X-Customer-Reference', customerReference)
  }

  const response = await api.sendAPIRequest(
    '/uploads/folder',
    {
      method: 'POST',
      headers,
    },
    JSON.stringify({ fileTree, uploadOptions }),
  )

  if (!response.ok) {
    throw await toApiError(response, 'Failed to create folder upload')
  }

  return response.json()
}

/**
 * Creates a file upload within an existing folder upload.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ uploadId: string; name: string; mimeType: string; relativeId: string; uploadOptions: FileUploadOptions }>} args - The arguments for the file upload.
 * @param {string} args.uploadId - The ID of the folder upload to which the file will be added.
 * @param {string} args.name - The name of the file to be uploaded.
 * @param {string} args.mimeType - The MIME type of the file being uploaded.
 * @param {string} args.relativeId - The relative ID of the file within the folder structure.
 * @param {FileUploadOptions} [args.uploadOptions={}] - Additional options for the file upload.
 * @returns {Promise<FileUpload>} - A promise that resolves to the file upload information.
 * @throws {Error} - Throws an error if the upload fails.
 */
export const createFileUploadWithinFolderUpload = async (
  api: AutoDriveApiHandler,
  {
    uploadId,
    name,
    mimeType,
    relativeId,
    uploadOptions = {},
  }: ArgsWithoutPagination<{
    uploadId: string
    name: string
    mimeType?: string
    relativeId: string
    uploadOptions: FileUploadOptions
  }>,
): Promise<FileUpload> => {
  const response = await api.sendAPIRequest(
    `/uploads/folder/${uploadId}/file`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    },
    JSON.stringify({ name, mimeType, relativeId, uploadOptions }),
  )

  if (!response.ok) {
    throw await toApiError(response, 'Failed to create file upload within folder upload')
  }

  return response.json()
}

/**
 * Uploads a chunk of a file to the server.
 *
 * This function allows for the uploading of a specific chunk of a file
 * during a multi-part upload process. It sends the chunk along with its
 * index to the server, which can be used to reconstruct the file on the
 * server side.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ uploadId: string; chunk: Buffer; index: number }>} args - The arguments for the file chunk upload.
 * @param {string} args.uploadId - The ID of the upload session.
 * @param {Buffer} args.chunk - The chunk of the file to be uploaded.
 * @param {number} args.index - The index of the chunk in the overall file.
 * @returns {Promise<void>} - A promise that resolves when the chunk is uploaded successfully.
 * @throws {Error} - Throws an error if the upload fails.
 */
export const uploadFileChunk = async (
  api: AutoDriveApiHandler,
  {
    uploadId,
    chunk,
    index,
  }: ArgsWithoutPagination<{ uploadId: string; chunk: Buffer; index: number }>,
): Promise<void> => {
  const formData = new FormData()
  formData.append('file', new Blob([chunk as BlobPart]))
  formData.append('index', index.toString())

  const response = await api.sendAPIRequest(
    `/uploads/file/${uploadId}/chunk`,
    {
      method: 'POST',
    },
    formData,
  )

  if (!response.ok) {
    throw await toApiError(response, 'Failed to upload file chunk')
  }
}

/**
 * Completes a file or folder upload session on the server.
 *
 * This function sends a request to the server to finalize the upload
 * process for a given upload session identified by the upload ID. It is
 * typically called after all file chunks have been uploaded. This method
 * can be used to complete both file and folder uploads.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ uploadId: string }>} args - The arguments for completing the upload.
 * @param {string} args.uploadId - The ID of the upload session to complete.
 * @returns {Promise<any>} - A promise that resolves to the response from the server.
 * @throws {Error} - Throws an error if the completion of the upload fails.
 */
export const completeUpload = async (
  api: AutoDriveApiHandler,
  { uploadId }: ArgsWithoutPagination<{ uploadId: string }>,
): Promise<CompleteUploadResponse> => {
  const response = await api.sendAPIRequest(`/uploads/${uploadId}/complete`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw await toApiError(response, 'Failed to complete upload')
  }

  return response.json() as Promise<CompleteUploadResponse>
}
