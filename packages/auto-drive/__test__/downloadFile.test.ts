import { apiCalls } from '../src/api/calls/index'
import { OffchainFileMetadata } from '../src/api/models/objects'
import { EncryptionAlgorithm } from '../src/api/models/uploads'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

jest.mock('@autonomys/auto-dag-data', () => ({
  decompressFile: jest.fn(),
  CompressionAlgorithm: { ZLIB: 'zlib' },
  EncryptionAlgorithm: { AES_256_GCM: 'aes-256-gcm' },
  decryptFile: jest.fn(),
}))

describe('downloadFile password validation', () => {
  const dummyHandler: AutoDriveApiHandler = {
    sendAPIRequest: jest.fn(),
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://example.com/api',
    downloadBaseUrl: 'https://example.com/downloads',
  }

  const encryptedMetadata: OffchainFileMetadata = {
    type: 'file',
    dataCid: 'data-cid',
    totalSize: BigInt(100),
    totalChunks: 1,
    chunks: [],
    uploadOptions: {
      encryption: {
        algorithm: EncryptionAlgorithm.AES_256_GCM,
      },
    },
  }

  const api = createApiInterface(dummyHandler)

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should throw an error without calling downloadObject when file is encrypted and no password is provided', async () => {
    jest.spyOn(apiCalls, 'getObjectMetadata').mockResolvedValue(encryptedMetadata)

    const downloadSpy = jest.spyOn(apiCalls, 'downloadObject')

    await expect(api.downloadFile('test-cid')).rejects.toThrow(
      'Password is required to decrypt the file',
    )
    expect(downloadSpy).not.toHaveBeenCalled()
  })

  it('should call downloadObject when password is provided for encrypted file', async () => {
    jest.spyOn(apiCalls, 'getObjectMetadata').mockResolvedValue(encryptedMetadata)

    const emptyStream = new ReadableStream<Uint8Array>()
    const downloadSpy = jest.spyOn(apiCalls, 'downloadObject').mockResolvedValue(emptyStream)

    await api.downloadFile('test-cid', 'correct-password')
    expect(downloadSpy).toHaveBeenCalledWith(dummyHandler, { cid: 'test-cid' })
  })
})
