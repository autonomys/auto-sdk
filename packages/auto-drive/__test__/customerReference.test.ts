import {
  CUSTOMER_REFERENCE_REGEX,
  validateCustomerReference,
  createFileUpload,
  createFolderUpload,
} from '../src/api/calls/upload'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

jest.mock('@autonomys/auto-dag-data', () => ({
  compressFile: jest.fn((iterable) => iterable),
  decompressFile: jest.fn(),
  CompressionAlgorithm: { ZLIB: 'zlib' },
  EncryptionAlgorithm: { AES_256_GCM: 'aes-256-gcm' },
  decryptFile: jest.fn(),
  encryptFile: jest.fn((iterable) => iterable),
}))

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const mockApi = (
  handler?: (url: string, init: RequestInit, body?: BodyInit) => Promise<Response>,
): AutoDriveApiHandler => ({
  sendAPIRequest: jest.fn(
    handler ?? (async () => jsonResponse({ id: 'mock-upload-id', cid: 'mock-cid' })),
  ),
  sendDownloadRequest: jest.fn(async () => jsonResponse({})),
  baseUrl: 'https://example.invalid/api',
  downloadBaseUrl: 'https://example.invalid/downloads',
})

describe('customerReference', () => {
  describe('regex and validation', () => {
    it('accepts undefined without error', () => {
      expect(() => validateCustomerReference(undefined)).not.toThrow()
    })

    it.each([
      'order-12345',
      'user_upload:99',
      'backup.2026-11-05',
      'a',
      'Z',
      '9',
      '-',
      '_',
      '.',
      ':',
      'a'.repeat(128),
      'A-1_b.2:C-3',
    ])('accepts valid reference: %s', (validRef) => {
      expect(CUSTOMER_REFERENCE_REGEX.test(validRef)).toBe(true)
      expect(() => validateCustomerReference(validRef)).not.toThrow()
    })

    it('rejects empty string', () => {
      expect(CUSTOMER_REFERENCE_REGEX.test('')).toBe(false)
      expect(() => validateCustomerReference('')).toThrow(
        /Invalid customer reference.*Must be a string up to 128 characters/,
      )
    })

    it('rejects references longer than 128 characters', () => {
      const longRef = 'a'.repeat(129)
      expect(CUSTOMER_REFERENCE_REGEX.test(longRef)).toBe(false)
      expect(() => validateCustomerReference(longRef)).toThrow(
        /Invalid customer reference.*Must be a string up to 128 characters/,
      )
    })

    it.each([
      'with space',
      'user@domain',
      'ref/with/slash',
      'ref#tag',
      'ref?query',
      'ref$dollar',
      'ref!exclamation',
      'ref+plus',
      'ref=equals',
    ])('rejects forbidden characters: %s', (invalidRef) => {
      expect(CUSTOMER_REFERENCE_REGEX.test(invalidRef)).toBe(false)
      expect(() => validateCustomerReference(invalidRef)).toThrow(
        /Invalid customer reference.*Must be a string up to 128 characters/,
      )
    })

    it.each([null, 12345, {}, [], true])('rejects non-string types: %s', (nonString) => {
      expect(() => validateCustomerReference(nonString as unknown as string)).toThrow(
        /Invalid customer reference.*Must be a string up to 128 characters/,
      )
    })
  })

  describe('createFileUpload', () => {
    it('sends X-Customer-Reference header when customerReference is provided', async () => {
      let capturedRequest: RequestInit | undefined
      const api = mockApi(async (_url, init) => {
        capturedRequest = init
        return jsonResponse({ id: 'upload-123' })
      })

      const result = await createFileUpload(api, {
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        uploadOptions: null,
        customerReference: 'invoice-2026:001',
      })

      expect(result).toEqual({ id: 'upload-123' })
      const headers = capturedRequest?.headers as Headers
      expect(headers.get('X-Customer-Reference')).toBe('invoice-2026:001')
      expect(headers.get('Content-Type')).toBe('application/json')
    })

    it('omits X-Customer-Reference header when customerReference is not provided', async () => {
      let capturedRequest: RequestInit | undefined
      const api = mockApi(async (_url, init) => {
        capturedRequest = init
        return jsonResponse({ id: 'upload-123' })
      })

      await createFileUpload(api, {
        filename: 'document.pdf',
        uploadOptions: null,
      })

      const headers = capturedRequest?.headers as Headers
      expect(headers.has('X-Customer-Reference')).toBe(false)
    })

    it('rejects invalid customerReference before calling the API', async () => {
      const api = mockApi()

      await expect(
        createFileUpload(api, {
          filename: 'document.pdf',
          uploadOptions: null,
          customerReference: 'invalid reference with spaces',
        }),
      ).rejects.toThrow(/Invalid customer reference/)

      expect(api.sendAPIRequest).not.toHaveBeenCalled()
    })
  })

  describe('createFolderUpload', () => {
    const fileTree = {
      name: 'folder',
      type: 'folder' as const,
      children: [],
      id: 'root',
    }

    it('sends X-Customer-Reference header when customerReference is provided', async () => {
      let capturedRequest: RequestInit | undefined
      const api = mockApi(async (_url, init) => {
        capturedRequest = init
        return jsonResponse({ id: 'folder-upload-123' })
      })

      const result = await createFolderUpload(api, {
        fileTree,
        customerReference: 'backup-folder_v1.0',
      })

      expect(result).toEqual({ id: 'folder-upload-123' })
      const headers = capturedRequest?.headers as Headers
      expect(headers.get('X-Customer-Reference')).toBe('backup-folder_v1.0')
      expect(headers.get('Content-Type')).toBe('application/json')
    })

    it('omits X-Customer-Reference header when customerReference is not provided', async () => {
      let capturedRequest: RequestInit | undefined
      const api = mockApi(async (_url, init) => {
        capturedRequest = init
        return jsonResponse({ id: 'folder-upload-123' })
      })

      await createFolderUpload(api, { fileTree })

      const headers = capturedRequest?.headers as Headers
      expect(headers.has('X-Customer-Reference')).toBe(false)
    })

    it('rejects invalid customerReference before calling the API', async () => {
      const api = mockApi()

      await expect(
        createFolderUpload(api, {
          fileTree,
          customerReference: 'folder@invalid!',
        }),
      ).rejects.toThrow(/Invalid customer reference/)

      expect(api.sendAPIRequest).not.toHaveBeenCalled()
    })
  })

  describe('wrapper propagation', () => {
    it('uploadFile propagates customerReference to createFileUpload', async () => {
      const capturedHeaders: string[] = []
      const api = mockApi(async (url, init) => {
        const headers = init.headers as Headers
        const ref = headers?.get('X-Customer-Reference')
        if (ref) capturedHeaders.push(ref)

        if (url === '/uploads/file') {
          return jsonResponse({ id: 'upload-file-id' })
        }
        if (url.includes('/chunk')) {
          return jsonResponse({})
        }
        if (url.includes('/complete')) {
          return jsonResponse({ cid: 'bafy-result-cid' })
        }
        return jsonResponse({})
      })

      const client = createApiInterface(api)
      const fakeFile = {
        read: () =>
          (async function* () {
            yield Buffer.from('test data')
          })(),
        name: 'test.txt',
        size: 9,
      }

      const cid = await client.uploadFile(fakeFile, {
        customerReference: 'my-custom-file-ref_01',
        compression: false,
      })

      expect(cid).toBe('bafy-result-cid')
      expect(capturedHeaders).toContain('my-custom-file-ref_01')
    })

    it('uploadFolderFromInput propagates customerReference to createFolderUpload', async () => {
      const capturedHeaders: string[] = []
      const api = mockApi(async (url, init) => {
        const headers = init.headers as Headers
        const ref = headers?.get('X-Customer-Reference')
        if (ref) capturedHeaders.push(ref)

        if (url === '/uploads/folder') {
          return jsonResponse({ id: 'folder-upload-id' })
        }
        if (url.includes('/file')) {
          return jsonResponse({ id: 'file-in-folder-id' })
        }
        if (url.includes('/chunk')) {
          return jsonResponse({})
        }
        if (url.includes('/complete')) {
          return jsonResponse({ cid: 'bafy-folder-cid' })
        }
        return jsonResponse({})
      })

      const client = createApiInterface(api)
      const fakeFile = {
        name: 'item.txt',
        webkitRelativePath: 'folder/item.txt',
        size: 4,
        slice: () => new Blob(),
      } as unknown as File
      const fakeFileList: File[] = [fakeFile]

      const cid = await client.uploadFolderFromInput(fakeFileList, {
        customerReference: 'my-custom-folder-ref_02',
      })

      expect(cid).toBe('bafy-folder-cid')
      expect(capturedHeaders).toContain('my-custom-folder-ref_02')
    })
  })
})
