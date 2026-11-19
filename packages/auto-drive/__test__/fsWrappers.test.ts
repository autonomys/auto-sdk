import fs from 'fs'
import { Readable } from 'stream'
import { apiCalls } from '../src/api/calls/index'
import { AutoDriveApi } from '../src/api/types'
import * as fsUtils from '../src/fs/utils'
import { uploadFileFromFilepath, uploadFolderFromFolderPath } from '../src/fs/wrappers'

describe('Node fs wrappers cross-platform path handling', () => {
  const mockApi = {
    uploadFile: jest.fn(),
    uploadFileWithinFolderUpload: jest.fn(),
    sendAPIRequest: jest.fn(),
    sendDownloadRequest: jest.fn(),
  } as unknown as AutoDriveApi

  beforeEach(() => {
    jest.spyOn(fs, 'statSync').mockReturnValue({ size: 12 } as fs.Stats)
    jest
      .spyOn(fs, 'createReadStream')
      .mockImplementation(() => Readable.from([Buffer.from('hello world!')]) as fs.ReadStream)
    jest.mocked(mockApi.uploadFile).mockResolvedValue('uploaded-cid')
    jest.mocked(mockApi.uploadFileWithinFolderUpload).mockResolvedValue('file-cid')
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  describe('uploadFileFromFilepath', () => {
    it.each([
      ['Windows path', 'C:\\Users\\alice\\docs\\report.pdf'],
      ['POSIX path', '/home/alice/docs/report.pdf'],
    ])('extracts base name and MIME type from %s', async (_, filePath) => {
      await uploadFileFromFilepath(mockApi, filePath)

      expect(mockApi.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'report.pdf',
          mimeType: 'application/pdf',
          size: 12,
        }),
        expect.any(Object),
        undefined,
      )
    })
  })

  describe('uploadFolderFromFolderPath', () => {
    it('builds the same nested folderTree for Windows paths as POSIX paths', async () => {
      const createFolderUploadSpy = jest
        .spyOn(apiCalls, 'createFolderUpload')
        .mockResolvedValue({ id: 'folder-upload-id' } as never)
      jest.spyOn(apiCalls, 'completeUpload').mockResolvedValue({ cid: 'folder-cid' })

      jest
        .spyOn(fsUtils, 'getFiles')
        .mockResolvedValueOnce([
          '\\workspace\\bundle\\top.json',
          '\\workspace\\bundle\\sub\\nested.txt',
        ])
        .mockResolvedValueOnce(['/workspace/bundle/top.json', '/workspace/bundle/sub/nested.txt'])

      await uploadFolderFromFolderPath(mockApi, '\\workspace\\bundle')
      await uploadFolderFromFolderPath(mockApi, '/workspace/bundle')

      const windowsTree = createFolderUploadSpy.mock.calls[0][1].fileTree
      const posixTree = createFolderUploadSpy.mock.calls[1][1].fileTree

      expect(windowsTree).toEqual(posixTree)
      expect(mockApi.uploadFileWithinFolderUpload).toHaveBeenNthCalledWith(
        1,
        'folder-upload-id',
        expect.objectContaining({
          name: 'top.json',
          mimeType: 'application/json',
          path: '/workspace/bundle/top.json',
        }),
        undefined,
        expect.any(Object),
      )
      expect(mockApi.uploadFileWithinFolderUpload).toHaveBeenNthCalledWith(
        2,
        'folder-upload-id',
        expect.objectContaining({
          name: 'nested.txt',
          mimeType: 'text/plain',
          path: '/workspace/bundle/sub/nested.txt',
        }),
        undefined,
        expect.any(Object),
      )
    })

    it('uses the folder base name for encrypted zip uploads on Windows paths', async () => {
      jest.spyOn(fsUtils, 'getFiles').mockResolvedValue(['C:\\workspace\\bundle\\nested\\file.txt'])
      const zipSpy = jest
        .spyOn(fsUtils, 'constructZipFromTreeAndFileSystemPaths')
        .mockResolvedValue(new Blob(['zip-bytes']))

      await uploadFolderFromFolderPath(mockApi, 'C:\\workspace\\bundle', {
        password: 'secret',
      })

      expect(zipSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'folder' }), {
        'C:/workspace/bundle/nested/file.txt': 'C:\\workspace\\bundle\\nested\\file.txt',
      })
      expect(mockApi.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'bundle.zip',
          mimeType: 'application/zip',
        }),
        expect.objectContaining({ password: 'secret', compression: true }),
        undefined,
      )
    })
  })
})
