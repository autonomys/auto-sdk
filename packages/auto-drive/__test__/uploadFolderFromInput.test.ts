import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

describe('uploadFolderFromInput', () => {
  const dummyHandler: AutoDriveApiHandler = {
    sendAPIRequest: jest.fn(),
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://example.com/api',
    downloadBaseUrl: 'https://example.com/downloads',
  }

  const api = createApiInterface(dummyHandler)
  const emptyFileList = { length: 0, item: () => null } as unknown as FileList

  afterEach(() => {
    jest.clearAllMocks()
  })

  it.each([
    ['an empty array without a password', [], {}],
    ['an empty array with a password', [], { password: 'secret' }],
    ['an empty FileList', emptyFileList, {}],
  ])('rejects when given %s and makes no API calls', async (_, files, options) => {
    await expect(api.uploadFolderFromInput(files, options)).rejects.toThrow('No files to upload')

    expect(dummyHandler.sendAPIRequest).not.toHaveBeenCalled()
  })
})
