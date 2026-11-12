import mime from 'mime-types'
import { apiCalls } from '../src/api/calls/index'
import { FileUpload } from '../src/api/models/uploads'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'
import { lookupMimeType } from '../src/utils/mimeType'

jest.mock('@autonomys/auto-dag-data', () => ({
  compressFile: jest.fn((iterable) => iterable),
  CompressionAlgorithm: { ZLIB: 'ZLIB' },
  EncryptionAlgorithm: { AES_256_GCM: 'AES_256_GCM' },
  encryptFile: jest.fn((iterable) => iterable),
}))

const mimeTypesLookup = (fileName: string) => mime.lookup(fileName) || undefined

describe('lookupMimeType', () => {
  it('matches mime-types for every known extension', () => {
    const fileNames = Object.values(mime.extensions)
      .flat()
      .flatMap((extension) => [`file.${extension}`, `FILE.${extension.toUpperCase()}`])

    expect(fileNames.map((name) => [name, lookupMimeType(name)])).toEqual(
      fileNames.map((name) => [name, mimeTypesLookup(name)]),
    )
  })

  it.each([
    'README',
    'json',
    '.json',
    'archive.tar.gz',
    'dir/a.txt',
    'dir.d/README',
    '.bashrc',
    'dir/.bashrc',
    'dir/.a.txt',
    'a.',
    'a..',
    '..',
    '',
    'file.unknownextension',
  ])('matches mime-types for %j', (fileName) => {
    expect(lookupMimeType(fileName)).toBe(mimeTypesLookup(fileName))
  })
})

describe('uploadFile MIME type', () => {
  const dummyHandler: AutoDriveApiHandler = {
    sendAPIRequest: jest.fn(),
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://example.com/api',
    downloadBaseUrl: 'https://example.com/downloads',
  }

  const api = createApiInterface(dummyHandler)

  let createFileUploadSpy: jest.SpyInstance

  beforeEach(() => {
    createFileUploadSpy = jest
      .spyOn(apiCalls, 'createFileUpload')
      .mockResolvedValue({ id: 'upload-id' } as FileUpload)
    jest.spyOn(apiCalls, 'uploadFileChunk').mockResolvedValue()
    jest.spyOn(apiCalls, 'completeUpload').mockResolvedValue({ cid: 'file-cid' })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('sends application/json for uploadObjectAsJSON(obj, "config")', async () => {
    await api.uploadObjectAsJSON({ key: 'value' }, 'config')

    expect(createFileUploadSpy).toHaveBeenCalledWith(
      dummyHandler,
      expect.objectContaining({
        filename: 'config',
        mimeType: 'application/json',
      }),
    )
  })

  it('sends image/png for a File named "screenshot" with type "image/png"', async () => {
    const file = new File(['png-bytes'], 'screenshot', { type: 'image/png' })

    await api.uploadFileFromInput(file, {})

    expect(createFileUploadSpy).toHaveBeenCalledWith(
      dummyHandler,
      expect.objectContaining({
        filename: 'screenshot',
        mimeType: 'image/png',
      }),
    )
  })

  it('falls back to lookupMimeType(file.name) when File.type is empty', async () => {
    const file = new File(['hello'], 'notes.txt', { type: '' })

    await api.uploadFileFromInput(file, {})

    expect(createFileUploadSpy).toHaveBeenCalledWith(
      dummyHandler,
      expect.objectContaining({
        filename: 'notes.txt',
        mimeType: 'text/plain',
      }),
    )
  })
})
