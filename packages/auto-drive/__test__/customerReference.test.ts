import { tmpdir } from 'os'
import path from 'path'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { Buffer } from 'buffer'
import { apiCalls } from '../src/api/calls/index'
import * as folderTree from '../src/api/models/folderTree'
import { FileUpload, FolderUpload } from '../src/api/models/uploads'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'
import { uploadFileFromFilepath, uploadFolderFromFolderPath } from '../src/fs/wrappers'
import { INVALID_CUSTOMER_REFERENCE } from '../src/utils/customerReference'

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
  return { handler, sendAPIRequest, sentReference }
}

// Each of these is rejected by the server's format. Without the SDK's check, the first two
// throw a TypeError in Headers, and the next is trimmed and then accepted.
const invalidReferences = [
  ['a character above U+00FF', 'клиент-1'],
  ['a line break', 'a\nb'],
  ['surrounding whitespace', ' cust-1 '],
  ['an inner space', 'cust 1'],
  ['an empty string', ''],
  ['129 characters', 'x'.repeat(129)],
]

const fileTree = { name: 'dir', type: 'folder' as const, id: 'dir', children: [] }

// A browser folder selection, with FileList, which the wrapper checks for, defined in Node.
const folderInput = () => {
  const global = globalThis as { FileList?: unknown }
  global.FileList ??= class FileList {}
  const file = new File(['content'], 'a.txt')
  Object.defineProperty(file, 'webkitRelativePath', { value: 'dir/a.txt' })
  return [file]
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
    const tagged = createHandler()
    await apiCalls.createFolderUpload(tagged.handler, { fileTree, customerReference: 'cust-1' })
    expect(tagged.sentReference()).toBe('cust-1')

    const untagged = createHandler()
    await apiCalls.createFolderUpload(untagged.handler, { fileTree })
    expect(untagged.sentReference()).toBeNull()
  })

  it('is not sent by createFileUploadWithinFolderUpload', async () => {
    const { handler, sentReference } = createHandler()
    await apiCalls.createFileUploadWithinFolderUpload(handler, {
      uploadId: 'folder-upload-id',
      name: 'a.txt',
      relativeId: 'dir/a.txt',
      uploadOptions: {},
    })
    expect(sentReference()).toBeNull()
  })

  it('is not sent for null, as a JavaScript caller might pass', async () => {
    const { handler, sentReference } = createHandler()
    await apiCalls.createFileUpload(handler, {
      filename: 'a.txt',
      uploadOptions: null,
      customerReference: null as unknown as string,
    })
    expect(sentReference()).toBeNull()
  })

  it('accepts every allowed character, up to 128 of them', async () => {
    for (const customerReference of ['AZaz09-_.:', 'x'.repeat(128)]) {
      const { handler, sentReference } = createHandler()
      await apiCalls.createFileUpload(handler, {
        filename: 'a.txt',
        uploadOptions: null,
        customerReference,
      })
      expect(sentReference()).toBe(customerReference)
    }
  })

  it.each(invalidReferences)(
    'rejects a reference with %s, stating the format, without sending a request',
    async (_, customerReference) => {
      const { handler, sendAPIRequest } = createHandler()
      await expect(
        apiCalls.createFileUpload(handler, {
          filename: 'a.txt',
          uploadOptions: null,
          customerReference,
        }),
      ).rejects.toThrow(INVALID_CUSTOMER_REFERENCE)
      await expect(
        apiCalls.createFolderUpload(handler, { fileTree, customerReference }),
      ).rejects.toThrow(INVALID_CUSTOMER_REFERENCE)
      expect(sendAPIRequest).not.toHaveBeenCalled()
    },
  )
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
    await api.uploadFolderFromInput(folderInput(), options)
    expect(createFolderUploadSpy).toHaveBeenCalledWith(expect.anything(), tagged)
  })

  it('reaches the folder upload from fs.uploadFolderFromFolderPath', async () => {
    await uploadFolderFromFolderPath(api, folder, options)
    expect(createFolderUploadSpy).toHaveBeenCalledWith(expect.anything(), tagged)
  })

  it('reaches the zip upload of an encrypted folder from uploadFolderFromInput', async () => {
    // JSZip reads a File with FileReader, which Node doesn't have.
    jest.spyOn(folderTree, 'constructZipBlobFromTreeAndPaths').mockResolvedValue(new Blob(['zip']))

    await api.uploadFolderFromInput(folderInput(), { ...options, password: 'secret' })
    expect(createFileUploadSpy).toHaveBeenCalledWith(expect.anything(), tagged)
    expect(createFolderUploadSpy).not.toHaveBeenCalled()
  })

  it('reaches the zip upload of an encrypted folder from fs.uploadFolderFromFolderPath', async () => {
    await uploadFolderFromFolderPath(api, folder, { ...options, password: 'secret' })
    expect(createFileUploadSpy).toHaveBeenCalledWith(expect.anything(), tagged)
    expect(createFolderUploadSpy).not.toHaveBeenCalled()
  })

  describe('with an invalid reference, fails before reading or creating anything', () => {
    const invalid = { customerReference: 'cust 1' }

    it('from uploadFile and uploadFileFromBuffer', async () => {
      const read = jest.fn()
      await expect(api.uploadFile({ read, name: 'a.txt', size: 7 }, invalid)).rejects.toThrow(
        INVALID_CUSTOMER_REFERENCE,
      )
      await expect(
        api.uploadFileFromBuffer(Buffer.from('content'), 'a.txt', invalid),
      ).rejects.toThrow(INVALID_CUSTOMER_REFERENCE)
      expect(read).not.toHaveBeenCalled()
      expect(createFileUploadSpy).not.toHaveBeenCalled()
    })

    it.each([
      ['without a password', {}],
      ['with a password', { password: 'secret' }],
    ])('from uploadFolderFromInput %s', async (_, extra) => {
      await expect(
        api.uploadFolderFromInput(folderInput(), { ...invalid, ...extra }),
      ).rejects.toThrow(INVALID_CUSTOMER_REFERENCE)
      expect(createFileUploadSpy).not.toHaveBeenCalled()
      expect(createFolderUploadSpy).not.toHaveBeenCalled()
    })

    it.each([
      ['without a password', {}],
      ['with a password', { password: 'secret' }],
    ])('from fs.uploadFolderFromFolderPath %s', async (_, extra) => {
      // A missing folder fails with ENOENT once read, so this error shows nothing was read.
      await expect(
        uploadFolderFromFolderPath(api, path.join(folder, 'missing'), { ...invalid, ...extra }),
      ).rejects.toThrow(INVALID_CUSTOMER_REFERENCE)
      expect(createFileUploadSpy).not.toHaveBeenCalled()
      expect(createFolderUploadSpy).not.toHaveBeenCalled()
    })
  })
})
