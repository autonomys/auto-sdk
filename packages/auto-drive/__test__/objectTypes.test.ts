import {
  getObject,
  getObjectSummary,
  getObjectUploadStatus,
  getToBeReviewedList,
} from '../src/api/calls/read'
import { ObjectStatus } from '../src/api/models/objects'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

// Responses copied from the mainnet Auto Drive API (GET /objects/:cid, /summary and /status)
const cid = 'bafkr6iahtm4qol5egxcjpm6pmrj7zcelho2fxk6hlwthde2fr7dhm2qyby'
const uploadState = {
  uploadedNodes: 5,
  totalNodes: 5,
  archivedNodes: 5,
  minimumBlockDepth: 4764189,
  maximumBlockDepth: 4764191,
}
// There is no public folder to copy a response from, so the folder ones follow the server code
// instead: it stores the folderMetadata of auto-dag-data with every bigint turned into a string
const folderCid = 'folder-cid'
const children = [{ type: 'file', name: 'Full Text Search Hasura.html', cid, totalSize: '206966' }]
const folderInformation = {
  uploadState,
  owners: [],
  status: 'Archived',
  createdAt: '2025-10-08T10:16:42.188Z',
  tags: [],
}
const responses: Record<string, unknown> = {
  [`/objects/${cid}`]: {
    cid,
    metadata: {
      name: 'Full Text Search Hasura.html',
      type: 'file',
      chunks: [
        { cid: 'bafkr6ieqzxaamjqkpwcuxntdrile72ry7zfiymsvavut4mlfhk7j472sya', size: '65066' },
        { cid: 'bafkr6igq4viujdktopyx2w46ghdsrtmw4xzkaynwanizkwfoaou5z5l644', size: '65066' },
        { cid: 'bafkr6iaew4ujpli3ogendfuc6s75mwrbhy4fiulmbl3336gcla2q3jr3iy', size: '65066' },
        { cid: 'bafkr6iacerug5yzrvjwlb6zpbrnuwh5jlhnqyzr3muerxmezhoj2g5hqmu', size: '11768' },
      ],
      dataCid: cid,
      mimeType: 'text/html',
      totalSize: '206966',
      totalChunks: 4,
      uploadOptions: { compression: { algorithm: 'ZLIB' } },
    },
    tags: [],
    uploadState,
    owners: [],
    status: 'Archived',
    publishedObjectId: null,
    createdAt: '2025-10-08T10:16:42.188Z',
  },
  [`/objects/${cid}/summary`]: {
    headCid: cid,
    name: 'Full Text Search Hasura.html',
    type: 'file',
    size: '206966',
    mimeType: 'text/html',
    uploadState,
    status: 'Archived',
    owners: [],
    createdAt: '2025-10-08T10:16:42.188Z',
    tags: [],
  },
  [`/objects/${cid}/status`]: uploadState,
  [`/objects/${folderCid}`]: {
    ...folderInformation,
    cid: folderCid,
    metadata: {
      dataCid: folderCid,
      totalSize: '206966',
      totalFiles: 1,
      children,
      type: 'folder',
      name: 'docs',
      uploadOptions: {},
    },
    publishedObjectId: null,
  },
  [`/objects/${folderCid}/summary`]: {
    ...folderInformation,
    headCid: folderCid,
    name: 'docs',
    type: 'folder',
    size: '206966',
    children,
  },
  // The review list is admin only, so this one follows the server code instead: it sends the
  // head CID of each reported object (getToBeReviewedList in auto-drive core/objects/object.ts)
  '/objects/to-be-reviewed/list?limit=50&offset=0': [cid],
}

const handler: AutoDriveApiHandler = {
  sendAPIRequest: jest.fn(async (relativeUrl: string) =>
    relativeUrl in responses
      ? new Response(JSON.stringify(responses[relativeUrl]), { status: 200 })
      : new Response(`Cannot GET ${relativeUrl}`, { status: 404 }),
  ),
  sendDownloadRequest: jest.fn(),
  baseUrl: 'https://example.com/api',
  downloadBaseUrl: 'https://example.com/downloads',
}

// These tests check that the types match what the server sends: with the old types,
// this file does not compile
describe('object types', () => {
  it('should type the object summary as the server sends it', async () => {
    const summary = await getObjectSummary(handler, { cid })

    const size: string = summary.size
    expect(size).toBe('206966')
    expect(summary.status).toBe(ObjectStatus.Archived)
    expect(summary.uploadState.archivedNodes).toBe(5)
    expect(summary.createdAt).toBe('2025-10-08T10:16:42.188Z')
    expect(summary.tags).toEqual([])
    // @ts-expect-error the server sends uploadState, not uploadStatus
    expect(summary.uploadStatus).toBeUndefined()
  })

  it('should type the object information as the server sends it', async () => {
    const object = await getObject(handler, { cid })

    expect(object.status).toBe(ObjectStatus.Archived)
    expect(object.uploadState.archivedNodes).toBe(5)
    expect(object.createdAt).toBe('2025-10-08T10:16:42.188Z')
    expect(object.publishedObjectId).toBeNull()
    expect(object.tags).toEqual([])
    // @ts-expect-error the server sends uploadState, not uploadStatus
    expect(object.uploadStatus).toBeUndefined()
  })

  it('should type the sizes in the file metadata as the strings that the server sends', async () => {
    const { metadata } = await getObject(handler, { cid })
    if (metadata.type !== 'file') throw new Error('Expected a file')

    const totalSize: string = metadata.totalSize
    const chunkSizes: string[] = metadata.chunks.map((chunk) => chunk.size)
    expect(totalSize).toBe('206966')
    expect(chunkSizes).toEqual(['65066', '65066', '65066', '11768'])
    // @ts-expect-error the server sends a string, so it needs BigInt() before any arithmetic
    expect(() => metadata.totalSize * BigInt(2)).toThrow(TypeError)
    // @ts-expect-error this works at runtime, but TypeScript doesn't compare a string with a bigint
    expect(metadata.totalSize > BigInt(100)).toBe(true)
  })

  it('should type the sizes in the folder metadata as the strings that the server sends', async () => {
    const { metadata } = await getObject(handler, { cid: folderCid })
    if (metadata.type !== 'folder') throw new Error('Expected a folder')

    const totalSize: string = metadata.totalSize
    const childSizes: string[] = metadata.children.map((child) => child.totalSize)
    expect(totalSize).toBe('206966')
    expect(childSizes).toEqual(['206966'])
  })

  it('should type the sizes of the children in a folder summary as strings', async () => {
    const summary = await getObjectSummary(handler, { cid: folderCid })
    if (summary.type !== 'folder') throw new Error('Expected a folder')

    const childSizes: string[] = summary.children.map((child) => child.totalSize)
    expect(childSizes).toEqual(['206966'])
  })

  it('should type the upload status as the server sends it', async () => {
    const status = await getObjectUploadStatus(handler, { cid })

    expect(status.archivedNodes).toBe(5)
    expect(status).toEqual(uploadState)
  })

  it('should type the review list as the CIDs that the server sends', async () => {
    const cids: string[] = await getToBeReviewedList(handler, { limit: 50, offset: 0 })
    const apiCids: string[] = await createApiInterface(handler).getToBeReviewedList(50, 0)

    expect(cids).toEqual([cid])
    expect(apiCids).toEqual([cid])
    // @ts-expect-error the server sends CIDs, not object summaries
    expect(cids[0].headCid).toBeUndefined()
  })
})
