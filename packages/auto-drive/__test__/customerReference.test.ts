import { tmpdir } from 'os'
import path from 'path'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { Buffer } from 'buffer'
import { apiCalls } from '../src/api/calls/index'
import { FileUpload, FolderUpload } from '../src/api/models/uploads'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'
import { uploadFileFromFilepath, uploadFolderFromFolderPath } from '../src/fs/wrappers'

jest.mock('@autonomys/auto-dag-data', () => ({
  compressFile: jest.fn((iterable) => iterable),
  CompressionAlgorithm: { ZLIB: 'ZLIB' },
  EncryptionAlgorithm: { AES_256_GCM: 'AES_256_GCM' },
  encryptFile: jest.fn((iterable) => iterable),
}))

const createHandler = () => {
  const sendAPIRequest = jest.fn<Promise<Response>, [string, Partial<Request>, BodyInit?]>(
    async () => new Response(JSON.stringify({ id: 'upload-id' }), { status: 200 }),
  )
  const handler: AutoDriveApiHandler = {
    sendAPIRequest,
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://example.com/api',
    downloadBaseUrl: 'https://example.com/downloads',
  }
  const sentReference = () =>
    (sendAPIRequest.mock.calls[0][1].headers as Headers).get('X-Customer-Reference')
  return { handler, sentReference }
}

describe('customer reference header', () => {
  it('is sent by createFileUpload when given, and not otherwise', async () => {
    const tagged = createHandler()
    await apiCalls.createFileUpload(tagged.handler, {
      filename: 'a.txt',
      uploadOptions: null,
      customerReference: 'cust-1',
    })
    expect(tagged.sentReference()).toBe('cust-1')

    const untagged = createHandler()
    await apiCalls.createFileUpload(untagged.handler, { filename: 'a.txt', uploadOptions: null })
    expect(untagged.sentReference()).toBeNull()
  })

  it('is sent by createFolderUpload when given, and not otherwise', async () => {
    const fileTree = { name: 'dir', type: 'folder' as const, id: 'dir', children: [] }

    const tagged = createHandler()
    await apiCalls.createFolderUpload(tagged.handler, { fileTree, customerReference: 'cust-1' })
    expect(tagged.sentReference()).toBe('cust-1')

    const untagged = createHandler()
    await apiCalls.createFolderUpload(untagged.handler, { fileTree })
    expect(untagged.sentReference()).toBeNull()
  })
})

describe('customerReference upload option', () => {
  const { handler } = createHandler()
  const api = createApiInterface(handler)
  const options = { customerReference: 'cust-1' }
  const tagged = expect.objectContaining(options)

  let createFileUploadSpy: jest.SpyInstance
  let createFolderUploadSpy: jest.SpyInstance
  let folder: string

  beforeEach(() => {
    createFileUploadSpy = jest
      .spyOn(apiCalls, 'createFileUpload')
      .mockResolvedValue({ id: 'file-upload-id' } as FileUpload)
    createFolderUploadSpy = jest
      .spyOn(apiCalls, 'createFolderUpload')
      .mockResolvedValue({ id: 'folder-upload-id' } as FolderUpload)
    jest
      .spyOn(apiCalls, 'createFileUploadWithinFolderUpload')
      .mockResolvedValue({ id: 'child-upload-id' } as FileUpload)
    jest.spyOn(apiCalls, 'uploadFileChunk').mockResolvedValue()
    jest.spyOn(apiCalls, 'completeUpload').mockResolvedValue({ cid: 'cid' })

    folder = mkdtempSync(path.join(tmpdir(), 'auto-drive-customer-reference-'))
    writeFileSync(path.join(folder, 'a.txt'), 'content')
  })

  afterEach(() => {
    jest.restoreAllMocks()
    rmSync(folder, { recursive: true, force: true })
  })

  it('reaches the file upload from uploadFileFromBuffer', async () => {
    await api.uploadFileFromBuffer(Buffer.from('content'), 'a.txt', options)
    expect(createFileUploadSpy).toHaveBeenCalledWith(expect.anything(), tagged)
  })

  it('reaches the file upload from fs.uploadFileFromFilepath', async () => {
    await uploadFileFromFilepath(api, path.join(folder, 'a.txt'), options)
    expect(createFileUploadSpy).toHaveBeenCalledWith(expect.anything(), tagged)
  })

  it('reaches the folder upload from uploadFolderFromInput', async () => {
    // A browser global the wrapper checks for, missing in Node.
    const global = globalThis as { FileList?: unknown }
    global.FileList ??= class FileList {}
    const file = new File(['content'], 'a.txt')
    Object.defineProperty(file, 'webkitRelativePath', { value: 'dir/a.txt' })

    await api.uploadFolderFromInput([file], options)
    expect(createFolderUploadSpy).toHaveBeenCalledWith(expect.anything(), tagged)
  })

  it('reaches the folder upload from fs.uploadFolderFromFolderPath', async () => {
    await uploadFolderFromFolderPath(api, folder, options)
    expect(createFolderUploadSpy).toHaveBeenCalledWith(expect.anything(), tagged)
  })

  it('reaches the zip upload of an encrypted folder', async () => {
    await uploadFolderFromFolderPath(api, folder, { ...options, password: 'secret' })
    expect(createFileUploadSpy).toHaveBeenCalledWith(expect.anything(), tagged)
    expect(createFolderUploadSpy).not.toHaveBeenCalled()
  })
})
