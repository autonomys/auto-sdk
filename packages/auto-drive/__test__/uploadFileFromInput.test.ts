import { apiCalls } from '../src/api/calls/index'
import { FileUpload } from '../src/api/models/uploads'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

jest.mock('@autonomys/auto-dag-data', () => ({
  compressFile: jest.fn((iterable) => iterable),
  CompressionAlgorithm: { ZLIB: 'zlib' },
  EncryptionAlgorithm: { AES_256_GCM: 'aes-256-gcm' },
  encryptFile: jest.fn((iterable) => iterable),
}))

describe('uploadFileFromInput', () => {
  const dummyHandler: AutoDriveApiHandler = {
    sendAPIRequest: jest.fn(),
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://example.com/api',
    downloadBaseUrl: 'https://example.com/downloads',
  }

  const api = createApiInterface(dummyHandler)
  const file = new File(['hello world'], 'hello.txt')

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('rejects when creating the upload fails', async () => {
    jest
      .spyOn(apiCalls, 'createFileUpload')
      .mockRejectedValue(new Error('Failed to create file upload: Invalid API key'))

    await expect(api.uploadFileFromInput(file, {})).rejects.toThrow(
      'Failed to create file upload: Invalid API key',
    )
  })

  it('rejects when uploading a chunk fails', async () => {
    jest.spyOn(apiCalls, 'createFileUpload').mockResolvedValue({ id: 'upload-id' } as FileUpload)
    jest
      .spyOn(apiCalls, 'uploadFileChunk')
      .mockRejectedValue(new Error('Failed to upload file chunk'))
    const completeSpy = jest.spyOn(apiCalls, 'completeUpload')

    await expect(api.uploadFileFromInput(file, {})).rejects.toThrow('Failed to upload file chunk')
    expect(completeSpy).not.toHaveBeenCalled()
  })

  it('resolves with the CID once the upload completes', async () => {
    jest.spyOn(apiCalls, 'createFileUpload').mockResolvedValue({ id: 'upload-id' } as FileUpload)
    const chunkSpy = jest.spyOn(apiCalls, 'uploadFileChunk').mockResolvedValue()
    jest.spyOn(apiCalls, 'completeUpload').mockResolvedValue({ cid: 'file-cid' })
    const onProgress = jest.fn()

    await expect(api.uploadFileFromInput(file, { onProgress })).resolves.toBe('file-cid')
    expect(chunkSpy).toHaveBeenCalledWith(dummyHandler, {
      uploadId: 'upload-id',
      chunk: Buffer.from('hello world'),
      index: 0,
    })
    expect(onProgress).toHaveBeenLastCalledWith(100)
  })
})
