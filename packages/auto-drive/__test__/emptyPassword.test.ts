import { tmpdir } from 'os'
import path from 'path'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { apiCalls } from '../src/api/calls/index'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'
import { uploadFolderFromFolderPath } from '../src/fs/wrappers'

jest.mock('@autonomys/auto-dag-data', () => ({
  compressFile: jest.fn((iterable) => iterable),
  CompressionAlgorithm: { ZLIB: 'ZLIB' },
  EncryptionAlgorithm: { AES_256_GCM: 'AES_256_GCM' },
  encryptFile: jest.fn((iterable) => iterable),
}))

describe('Empty password validation', () => {
  const dummyHandler: AutoDriveApiHandler = {
    sendAPIRequest: jest.fn(),
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://example.com/api',
    downloadBaseUrl: 'https://example.com/downloads',
  }

  const api = createApiInterface(dummyHandler)

  let createFileUploadSpy: jest.SpyInstance
  let createFolderUploadSpy: jest.SpyInstance
  let uploadFileChunkSpy: jest.SpyInstance
  let completeUploadSpy: jest.SpyInstance

  beforeEach(() => {
    createFileUploadSpy = jest.spyOn(apiCalls, 'createFileUpload')
    createFolderUploadSpy = jest.spyOn(apiCalls, 'createFolderUpload')
    uploadFileChunkSpy = jest.spyOn(apiCalls, 'uploadFileChunk')
    completeUploadSpy = jest.spyOn(apiCalls, 'completeUpload')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const expectNoApiCallsMade = () => {
    expect(createFileUploadSpy).not.toHaveBeenCalled()
    expect(createFolderUploadSpy).not.toHaveBeenCalled()
    expect(uploadFileChunkSpy).not.toHaveBeenCalled()
    expect(completeUploadSpy).not.toHaveBeenCalled()
    expect(dummyHandler.sendAPIRequest).not.toHaveBeenCalled()
    expect(dummyHandler.sendDownloadRequest).not.toHaveBeenCalled()
  }

  describe('uploadFile', () => {
    it('rejects when password is an empty string and makes no API calls', async () => {
      const buffer = Buffer.from('hello world')

      await expect(
        api.uploadFile(
          {
            name: 'test.txt',
            size: buffer.length,
            read: async function* () {
              yield buffer
            },
          },
          { password: '' },
        ),
      ).rejects.toThrow('Password cannot be empty')

      expectNoApiCallsMade()
    })

    it('rejects in uploadFileFromBuffer when password is an empty string and makes no API calls', async () => {
      await expect(
        api.uploadFileFromBuffer(Buffer.from('content'), 'test.bin', { password: '' }),
      ).rejects.toThrow('Password cannot be empty')

      expectNoApiCallsMade()
    })

    it('rejects in uploadFileFromInput when password is an empty string and makes no API calls', async () => {
      const file = new File(['content'], 'test.txt')

      await expect(api.uploadFileFromInput(file, { password: '' })).rejects.toThrow(
        'Password cannot be empty',
      )

      expectNoApiCallsMade()
    })
  })

  describe('uploadFolderFromInput', () => {
    it('rejects when password is an empty string and makes no API calls', async () => {
      const file = new File(['content'], 'file.txt')
      Object.defineProperty(file, 'webkitRelativePath', {
        value: 'folder/file.txt',
      })

      await expect(api.uploadFolderFromInput([file], { password: '' })).rejects.toThrow(
        'Password cannot be empty',
      )

      expectNoApiCallsMade()
    })
  })

  describe('uploadFolderFromFolderPath', () => {
    it('rejects when password is an empty string and makes no API calls', async () => {
      const folder = mkdtempSync(path.join(tmpdir(), 'auto-drive-empty-pwd-'))
      writeFileSync(path.join(folder, 'test.txt'), 'content')

      try {
        await expect(uploadFolderFromFolderPath(api, folder, { password: '' })).rejects.toThrow(
          'Password cannot be empty',
        )

        expectNoApiCallsMade()
      } finally {
        rmSync(folder, { recursive: true, force: true })
      }
    })
  })
})
