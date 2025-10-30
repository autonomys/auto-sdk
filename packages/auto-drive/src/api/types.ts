import { ObjectSummary } from './models'
import { AsyncDownload } from './models/asyncDownloads'
import { PaginatedResult } from './models/common'
import { GenericFile, GenericFileWithinFolder } from './models/file'
import { SubscriptionInfo, UserInfo } from './models/user'
import { AutoDriveNetwork } from './networks'

export interface AutoDriveApi extends AutoDriveApiHandler {
  /**
   * Gets the user info for the current user.
   *
   * @returns {Promise<UserInfo>} A promise that resolves to the user info.
   */
  me: () => Promise<UserInfo>

  /**
   * Checks if a file is cached.
   *
   * @param cid {string} - The CID of the file to check.
   * @returns {Promise<boolean>} - A promise that resolves to true if the file is cached, false otherwise.
   */
  isFileCached: (cid: string) => Promise<boolean>

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
  uploadFileFromInput: (
    file: File,
    options: UploadFileOptions,
    uploadChunkSize?: number,
  ) => Promise<string>
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
  uploadFile: (
    file: GenericFile,
    options: UploadFileOptions,
    uploadChunkSize?: number,
  ) => Promise<string>
  /**
   * Uploads a buffer to the server with optional encryption and compression.
   *
   * @param {AutoDriveApi} api - The API instance used to send requests.
   * @param {Buffer} buffer - The buffer to be uploaded.
   * @param {string} name - The name of the file to be uploaded.
   * @param {UploadFileOptions} options - Options for the upload process.
   * @param {number} [uploadChunkSize] - The size of each chunk to upload (optional).
   * @returns {Promise<string>} - The CID of the uploaded file.
   * @throws {Error} - Throws an error if the upload fails at any stage.
   */
  uploadFileFromBuffer: (
    buffer: Buffer,
    name: string,
    options: UploadFileOptions,
    uploadChunkSize?: number,
  ) => Promise<string>
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
  uploadObjectAsJSON: (
    object: unknown,
    name?: string | undefined,
    options?: UploadFileOptions,
    uploadChunkSize?: number,
  ) => Promise<string>
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
  uploadFolderFromInput: (
    fileList: FileList | File[],
    options: {
      uploadChunkSize?: number
      password?: string
      onProgress?: (progress: number) => void
    },
  ) => Promise<string>
  /**
   * Uploads a file within an existing folder upload session.
   *
   * @param {AutoDriveApi} api - The API instance to interact with the AutoDrive service.
   * @param {string} uploadId - The ID of the folder upload session to which the file will be added.
   * @param {string} filepath - The path of the file to be uploaded.
   *
   * @returns {Promise<void>} A promise that resolves when the file upload is complete.
   */
  uploadFileWithinFolderUpload: (
    uploadId: string,
    file: GenericFileWithinFolder,
    uploadChunkSize?: number,
    options?: Pick<UploadFileOptions, 'onProgress'>,
  ) => Promise<string>
  /**
   * Downloads a file from the AutoDrive service.
   *
   * @param {AutoDriveApi} api - The API instance to interact with the AutoDrive service.
   * @param {string} cid - The CID of the file to be downloaded.
   * @returns {Promise<ReadableStream<Uint8Array>>} A promise that resolves to a ReadableStream of the downloaded file.
   */
  downloadFile: (cid: string, password?: string) => Promise<AsyncIterable<Buffer>>
  /**
   * Gets the pending credits for the current user.
   *
   * @returns {Promise<{ upload: number; download: number }>} A promise that resolves to the pending credits.
   */
  getPendingCredits: () => Promise<{ upload: number; download: number }>
  /**
   * Gets the subscription info for the current user.
   *
   * @returns {Promise<SubscriptionInfo>} A promise that resolves to the subscription info.
   */
  getSubscriptionInfo: () => Promise<SubscriptionInfo>
  /**
   * Publishes an object by sending a request to the server.
   *
   * If already published, it will return the same public download URL.
   *
   * @param cid {string} - The CID of the object to publish.
   * @returns {Promise<string>} - The public download URL of the published object.
   */
  publishObject: (cid: string) => Promise<string>
  /**
   * Gets the files of the current user.
   *
   * @param page {number} - The page number to get.
   * @param limit {number} - The number of files to get per page.
   * @returns {Promise<PaginatedResult<ObjectSummary>>} - A promise that resolves to the paginated result of the files.
   */
  getMyFiles: (page: number, limit: number) => Promise<PaginatedResult<ObjectSummary>>
  /**
   * Searches for files by name or CID in the user's files.
   *
   * @param value {string} - The value to search for.
   * @returns {Promise<ObjectSummary[]>} - A promise that resolves to the list of files matching the search criteria.
   */
  searchByNameOrCIDInMyFiles: (value: string) => Promise<ObjectSummary[]>
  /**
   * Searches for files by name or CID in the global files.
   *
   * @param value {string} - The value to search for.
   * @returns {Promise<ObjectSummary[]>} - A promise that resolves to the list of files matching the search criteria.
   */
  searchByNameOrCID: (value: string) => Promise<ObjectSummary[]>

  /**
   * Gets the async downloads for the current user.
   *
   * @returns {Promise<AsyncDownload[]>} - A promise that resolves to the list of async downloads.
   */
  getAsyncDownloads: () => Promise<AsyncDownload[]>

  /**
   * Creates an async download for a file.
   *
   * @param cid {string} - The CID of the file to create an async download for.
   * @returns {Promise<AsyncDownload>} - A promise that resolves to the async download.
   */
  createAsyncDownload: (cid: string) => Promise<AsyncDownload>

  /**
   * Gets an async download by ID.
   *
   * @param downloadId {string} - The ID of the async download to get.
   * @returns {Promise<AsyncDownload>} - A promise that resolves to the async download.
   */
  getAsyncDownload: (downloadId: string) => Promise<AsyncDownload>

  /**
   * Dismisses an async download by ID.
   *
   * @param downloadId {string} - The ID of the async download to dismiss.
   * @returns {Promise<void>} - A promise that resolves when the async download is dismissed.
   */
  dismissAsyncDownload: (downloadId: string) => Promise<void>

  /**
   * Reports a file
   *
   * @param cid {string} - The CID of the node to get.
   * @returns {Promise<ArrayBuffer>} - A promise that resolves to the node data.
   */
  reportFile: (cid: string) => Promise<void>

  /**
   * Reports an object by sending a request to the server.
   *
   * This function sends a request to the server to report an object identified
   * by its CID. The report will be reviewed by moderators.
   *
   * @param cid {string} - The CID of the object to report.
   * @returns {Promise<void>} - A promise that resolves when the object has been successfully reported.
   */
  reportObject: (cid: string) => Promise<void>

  /**
   * Bans an object by sending a request to the server.
   *
   * This function sends a request to the server to ban an object identified
   * by its CID. Only authorized users can ban objects.
   *
   * @param cid {string} - The CID of the object to ban.
   * @returns {Promise<void>} - A promise that resolves when the object has been successfully banned.
   */
  banObject: (cid: string) => Promise<void>

  /**
   * Dismisses a report on an object by sending a request to the server.
   *
   * This function sends a request to the server to dismiss a report on an object
   * identified by its CID. Only authorized users can dismiss reports.
   *
   * @param cid {string} - The CID of the object whose report should be dismissed.
   * @returns {Promise<void>} - A promise that resolves when the report has been successfully dismissed.
   */
  dismissReport: (cid: string) => Promise<void>

  /**
   * Gets the list of objects that need to be reviewed.
   *
   * This function sends a request to the server to fetch a list of objects
   * that have been reported and need moderation review.
   *
   * @param limit {number} - The maximum number of objects to return (default: 100).
   * @param offset {number} - The number of objects to skip for pagination (default: 0).
   * @returns {Promise<ObjectSummary[]>} - A promise that resolves to the list of objects to be reviewed.
   */
  getToBeReviewedList: (limit?: number, offset?: number) => Promise<ObjectSummary[]>
}

export interface AutoDriveApiHandler {
  sendAPIRequest: (
    relativeUrl: string,
    request: Partial<Request>,
    body?: BodyInit,
  ) => Promise<Response>
  sendDownloadRequest: (
    relativeUrl: string,
    request: Partial<Request>,
    body?: BodyInit,
  ) => Promise<Response>
  downloadBaseUrl: string
  baseUrl: string
}

export type UploadFileOptions = {
  password?: string
  compression?: boolean
  onProgress?: (progress: number) => void
}

export enum OAuthProvider {
  GOOGLE = 'google',
  DISCORD = 'discord',
}

export type ApiKeyAuthProvider = 'apikey'
export type AuthProvider = ApiKeyAuthProvider | 'oauth'

export type ConnectionOptions =
  | {
      provider?: AuthProvider
      apiKey?: string
      apiUrl?: null
      downloadServiceUrl?: null
      network: AutoDriveNetwork
    }
  | {
      provider?: AuthProvider
      apiKey?: string
      apiUrl: string
      downloadServiceUrl?: string
      network?: null
    }
