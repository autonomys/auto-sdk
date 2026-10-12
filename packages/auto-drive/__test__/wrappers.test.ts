import { apiCalls } from '../src/api/calls'
import { DownloadStatus } from '../src/api/models/asyncDownloads'
import { ObjectInformation } from '../src/api/models/objects'
import { CompleteUploadResponse, FileUpload } from '../src/api/models/uploads'
import { UserInfo } from '../src/api/models/user'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

jest.mock('../src/api/calls', () => ({
  apiCalls: {
    createFileUpload: jest.fn(),
    uploadFileChunk: jest.fn(),
    completeUpload: jest.fn(),
    getObjectMetadata: jest.fn(),
    downloadObject: jest.fn(),
    getMe: jest.fn(),
    getRoots: jest.fn(),
    searchByNameOrCID: jest.fn(),
    getObjectSummary: jest.fn(),
    downloadStatus: jest.fn(),
    reportObject: jest.fn(),
    banObject: jest.fn(),
    dismissReport: jest.fn(),
    getToBeReviewedList: jest.fn(),
    createAsyncDownload: jest.fn(),
    getAsyncDownload: jest.fn(),
    getAsyncDownloads: jest.fn(),
    dismissAsyncDownload: jest.fn(),
  },
}))

jest.mock('@autonomys/auto-dag-data', () => ({
  CompressionAlgorithm: { ZLIB: 'zlib' },
  EncryptionAlgorithm: { AES_256_GCM: 'aes-256-gcm' },
  compressFile: jest.fn((iterable) => iterable),
  decompressFile: jest.fn((iterable) => iterable),
  encryptFile: jest.fn((iterable) => iterable),
  decryptFile: jest.fn((iterable) => iterable),
}))

describe('createApiInterface wrappers', () => {
  const mockApiHandler: AutoDriveApiHandler = {
    sendAPIRequest: jest.fn(),
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://api.test',
    downloadBaseUrl: 'https://download.test',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadObjectAsJSON', () => {
    it('serializes objects with BigInt values without throwing', async () => {
      const mockApiCalls = apiCalls as jest.Mocked<typeof apiCalls>
      mockApiCalls.createFileUpload.mockResolvedValue({ id: 'upload-id' } as unknown as FileUpload)
      mockApiCalls.uploadFileChunk.mockResolvedValue(undefined)
      mockApiCalls.completeUpload.mockResolvedValue({
        cid: 'cid-json',
      } as unknown as CompleteUploadResponse)

      const api = createApiInterface(mockApiHandler)

      const result = await api.uploadObjectAsJSON({
        balance: BigInt('1000000000000000000'),
        blockNumber: BigInt(42),
        name: 'test',
      })

      expect(result).toBe('cid-json')
      expect(mockApiCalls.createFileUpload).toHaveBeenCalledWith(
        mockApiHandler,
        expect.objectContaining({
          filename: 'object.json',
          mimeType: 'application/json',
        }),
      )
    })

    it('throws serialization error on circular object reference', async () => {
      const circular: Record<string, unknown> = {}
      circular.self = circular

      const api = createApiInterface(mockApiHandler)

      await expect(api.uploadObjectAsJSON(circular)).rejects.toThrow(
        'Failed to serialize object to JSON',
      )
    })
  })

  describe('downloadFile password validation guard', () => {
    it('throws early without downloading if file is encrypted but no password provided', async () => {
      const mockApiCalls = apiCalls as jest.Mocked<typeof apiCalls>
      mockApiCalls.getObjectMetadata.mockResolvedValue({
        uploadOptions: { encryption: true },
      } as unknown as ObjectInformation['metadata'])

      const api = createApiInterface(mockApiHandler)

      await expect(api.downloadFile('encrypted-cid')).rejects.toThrow(
        'Password is required to decrypt the file',
      )
      // downloadObject must NOT have been called
      expect(mockApiCalls.downloadObject).not.toHaveBeenCalled()
    })
  })

  describe('delegation methods', () => {
    it('getPendingCredits and getSubscriptionInfo delegate to getMe', async () => {
      const mockApiCalls = apiCalls as jest.Mocked<typeof apiCalls>
      mockApiCalls.getMe.mockResolvedValue({
        subscription: {
          pendingUploadCredits: 200,
          pendingDownloadCredits: 400,
        },
      } as unknown as UserInfo)

      const api = createApiInterface(mockApiHandler)

      const credits = await api.getPendingCredits()
      expect(credits).toEqual({ upload: 200, download: 400 })

      const sub = await api.getSubscriptionInfo()
      expect(sub).toEqual({ pendingUploadCredits: 200, pendingDownloadCredits: 400 })
    })

    it('isFileCached checks downloadStatus Cached value', async () => {
      const mockApiCalls = apiCalls as jest.Mocked<typeof apiCalls>
      mockApiCalls.downloadStatus.mockResolvedValue({ status: DownloadStatus.Cached })

      const api = createApiInterface(mockApiHandler)

      const cached = await api.isFileCached('test-cid')
      expect(cached).toBe(true)
    })
  })
})
