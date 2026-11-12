import { asyncByChunk } from '@autonomys/asynchronous'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { apiCalls } from '../src/api/calls/index'
import * as folderTree from '../src/api/models/folderTree'
import { FileUpload } from '../src/api/models/uploads'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'
import { uploadFolderFromFolderPath } from '../src/fs/wrappers'

jest.mock('@autonomys/auto-dag-data', () => ({
  compressFile: jest.fn(),
  CompressionAlgorithm: { ZLIB: 'ZLIB' },
  EncryptionAlgorithm: { AES_256_GCM: 'AES_256_GCM' },
  encryptFile: jest.fn(),
}))

const { compressFile, encryptFile } = jest.requireMock('@autonomys/auto-dag-data') as {
  compressFile: jest.Mock
  encryptFile: jest.Mock
}

// The real compressFile and encryptFile read their input ahead in blocks larger than an
// upload chunk before yielding anything, so the mocks do too.
const readAheadBlockSize = 400

const shrinkTenfold = async function* (iterable: AsyncIterable<Buffer>) {
  for await (const chunk of asyncByChunk(iterable, readAheadBlockSize)) {
    yield chunk.subarray(0, Math.ceil(chunk.length / 10))
  }
}

const double = async function* (iterable: AsyncIterable<Buffer>) {
  for await (const chunk of asyncByChunk(iterable, readAheadBlockSize)) {
    yield Buffer.concat([chunk, chunk])
  }
}

describe('upload progress', () => {
  const dummyHandler: AutoDriveApiHandler = {
    sendAPIRequest: jest.fn(),
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://example.com/api',
    downloadBaseUrl: 'https://example.com/downloads',
  }

  const api = createApiInterface(dummyHandler)
  const data = Buffer.alloc(1000, 'a')
  const uploadChunkSize = 100

  let chunkSpy: jest.SpyInstance

  beforeEach(() => {
    jest.spyOn(apiCalls, 'createFileUpload').mockResolvedValue({ id: 'upload-id' } as FileUpload)
    chunkSpy = jest.spyOn(apiCalls, 'uploadFileChunk').mockResolvedValue()
    jest.spyOn(apiCalls, 'completeUpload').mockResolvedValue({ cid: 'file-cid' })
    compressFile.mockImplementation((iterable) => iterable)
    encryptFile.mockImplementation((iterable) => iterable)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const progressValues = (onProgress: jest.Mock): number[] =>
    onProgress.mock.calls.map(([progress]) => progress)

  const expectToReach100AfterLastChunk = (onProgress: jest.Mock) => {
    const values = progressValues(onProgress)
    expect(values[values.length - 1]).toBe(100)
    expect(values.filter((progress) => progress >= 100)).toEqual([100])
    expect(values).toEqual([...values].sort((a, b) => a - b))

    const lastProgressCall = Math.max(...onProgress.mock.invocationCallOrder)
    const lastChunkCall = Math.max(...chunkSpy.mock.invocationCallOrder)
    expect(lastProgressCall).toBeGreaterThan(lastChunkCall)
  }

  it.each([
    ['shrinks', shrinkTenfold],
    ['grows', double],
  ])('ends at 100 when compression %s the data', async (_, transform) => {
    compressFile.mockImplementation(transform)
    const onProgress = jest.fn()

    await api.uploadFileFromBuffer(data, 'data.bin', { onProgress }, uploadChunkSize)

    expectToReach100AfterLastChunk(onProgress)
  })

  it.each([
    ['compression', {}],
    ['encryption', { compression: false, password: 'password' }],
  ])('reports each uploaded chunk when %s reads the source ahead', async (_, options) => {
    compressFile.mockImplementation(double)
    encryptFile.mockImplementation(double)
    const onProgress = jest.fn()

    await api.uploadFileFromBuffer(data, 'data.bin', { ...options, onProgress }, uploadChunkSize)

    const values = progressValues(onProgress)
    expect(chunkSpy).toHaveBeenCalledTimes(20)
    expect(values).toHaveLength(20)
    values.forEach((progress, index) => expect(progress).toBeCloseTo((index + 1) * 5))
    expectToReach100AfterLastChunk(onProgress)
  })

  it('ends at 100 when encryption grows the data', async () => {
    encryptFile.mockImplementation(double)
    const onProgress = jest.fn()

    await api.uploadFileFromBuffer(
      data,
      'data.bin',
      { compression: false, password: 'password', onProgress },
      uploadChunkSize,
    )

    expectToReach100AfterLastChunk(onProgress)
  })

  it('ends at 100 with compression and encryption', async () => {
    compressFile.mockImplementation(shrinkTenfold)
    encryptFile.mockImplementation(double)
    const onProgress = jest.fn()

    await api.uploadFileFromBuffer(
      data,
      'data.bin',
      { password: 'password', onProgress },
      uploadChunkSize,
    )

    expectToReach100AfterLastChunk(onProgress)
  })

  it('ends at 100 when uploading from a File with compression', async () => {
    compressFile.mockImplementation(shrinkTenfold)
    const onProgress = jest.fn()

    await api.uploadFileFromInput(new File([data], 'data.bin'), { onProgress }, uploadChunkSize)

    expectToReach100AfterLastChunk(onProgress)
  })

  it('ends at 100 when uploading a folder from disk with a password', async () => {
    compressFile.mockImplementation(shrinkTenfold)
    encryptFile.mockImplementation(double)
    const folder = mkdtempSync(path.join(tmpdir(), 'auto-drive-progress-'))
    writeFileSync(path.join(folder, 'data.bin'), data)
    const onProgress = jest.fn()

    try {
      await uploadFolderFromFolderPath(api, folder, { password: 'password', onProgress })
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }

    expectToReach100AfterLastChunk(onProgress)
  })

  const uploadedChunkLengths = (): number[] =>
    chunkSpy.mock.calls.map(([, { chunk }]) => chunk.length)

  it('uses uploadChunkSize when uploading a folder from disk with a password', async () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'auto-drive-progress-'))
    writeFileSync(path.join(folder, 'data.bin'), data)

    try {
      await uploadFolderFromFolderPath(api, folder, { password: 'password', uploadChunkSize })
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }

    expect(chunkSpy.mock.calls.length).toBeGreaterThan(1)
    expect(Math.max(...uploadedChunkLengths())).toBe(uploadChunkSize)
  })

  it('uses uploadChunkSize when uploading a folder from input with a password', async () => {
    const file = new File([data], 'data.bin')
    Object.defineProperty(file, 'webkitRelativePath', { value: 'folder/data.bin' })

    // JSZip cannot read a Node File, and FileList only exists in browsers
    jest.spyOn(folderTree, 'constructZipBlobFromTreeAndPaths').mockResolvedValue(new Blob([data]))
    const globals = globalThis as { FileList?: unknown }
    globals.FileList = class {}

    try {
      await api.uploadFolderFromInput([file], { password: 'password', uploadChunkSize })
    } finally {
      delete globals.FileList
    }

    expect(chunkSpy.mock.calls.length).toBeGreaterThan(1)
    expect(Math.max(...uploadedChunkLengths())).toBe(uploadChunkSize)
  })

  it('reports progress per uploaded chunk without compression or encryption', async () => {
    const onProgress = jest.fn()

    await api.uploadFileFromBuffer(
      data.subarray(0, 400),
      'data.bin',
      { compression: false, onProgress },
      uploadChunkSize,
    )

    expect(progressValues(onProgress)).toEqual([25, 50, 75, 100])
    expectToReach100AfterLastChunk(onProgress)
  })

  it('reports progress per uploaded chunk when source buffers do not line up with chunks', async () => {
    const onProgress = jest.fn()

    await api.uploadFile(
      {
        name: 'data.bin',
        size: 250,
        read: async function* () {
          yield data.subarray(0, 150)
          yield data.subarray(150, 250)
        },
      },
      { compression: false, onProgress },
      uploadChunkSize,
    )

    expect(progressValues(onProgress)).toEqual([40, 80, 100])
  })

  it('reaches 100 for an empty file', async () => {
    const onProgress = jest.fn()

    await api.uploadFileFromBuffer(Buffer.alloc(0), 'empty.bin', { onProgress })

    expect(progressValues(onProgress)).toEqual([100])
  })
})
