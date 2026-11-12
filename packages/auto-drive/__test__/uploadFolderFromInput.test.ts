import { apiCalls } from '../src/api/calls/index'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

jest.mock('@autonomys/auto-dag-data', () => ({
  compressFile: jest.fn((iterable) => iterable),
  CompressionAlgorithm: { ZLIB: 'ZLIB' },
  EncryptionAlgorithm: { AES_256_GCM: 'AES_256_GCM' },
  encryptFile: jest.fn((iterable) => iterable),
}))

describe('uploadFolderFromInput', () => {
  const dummyHandler: AutoDriveApiHandler = {
    sendAPIRequest: jest.fn(),
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://example.com/api',
    downloadBaseUrl: 'https://example.com/downloads',
  }

  const api = createApiInterface(dummyHandler)

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('rejects when given an empty list without a password and makes no API calls', async () => {
    const createFolderSpy = jest.spyOn(apiCalls, 'createFolderUpload')
    const createFileSpy = jest.spyOn(apiCalls, 'createFileUpload')
    const completeSpy = jest.spyOn(apiCalls, 'completeUpload')

    await expect(api.uploadFolderFromInput([], {})).rejects.toThrow('No files to upload')

    expect(createFolderSpy).not.toHaveBeenCalled()
    expect(createFileSpy).not.toHaveBeenCalled()
    expect(completeSpy).not.toHaveBeenCalled()
    expect(dummyHandler.sendAPIRequest).not.toHaveBeenCalled()
  })

  it('rejects when given an empty list with a password and makes no API calls', async () => {
    const createFolderSpy = jest.spyOn(apiCalls, 'createFolderUpload')
    const createFileSpy = jest.spyOn(apiCalls, 'createFileUpload')
    const completeSpy = jest.spyOn(apiCalls, 'completeUpload')

    await expect(api.uploadFolderFromInput([], { password: 'secret' })).rejects.toThrow(
      'No files to upload',
    )

    expect(createFolderSpy).not.toHaveBeenCalled()
    expect(createFileSpy).not.toHaveBeenCalled()
    expect(completeSpy).not.toHaveBeenCalled()
    expect(dummyHandler.sendAPIRequest).not.toHaveBeenCalled()
  })

  it('rejects when given an empty FileList and makes no API calls', async () => {
    const createFolderSpy = jest.spyOn(apiCalls, 'createFolderUpload')
    const createFileSpy = jest.spyOn(apiCalls, 'createFileUpload')
    const completeSpy = jest.spyOn(apiCalls, 'completeUpload')
    const emptyFileList = { length: 0, item: () => null } as unknown as FileList

    await expect(api.uploadFolderFromInput(emptyFileList, {})).rejects.toThrow('No files to upload')

    expect(createFolderSpy).not.toHaveBeenCalled()
    expect(createFileSpy).not.toHaveBeenCalled()
    expect(completeSpy).not.toHaveBeenCalled()
    expect(dummyHandler.sendAPIRequest).not.toHaveBeenCalled()
  })
})
