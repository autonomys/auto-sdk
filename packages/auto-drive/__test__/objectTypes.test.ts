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
const responses: Record<string, unknown> = {
  [`/objects/${cid}`]: {
    cid,
    metadata: {
      name: 'Full Text Search Hasura.html',
      type: 'file',
      chunks: [],
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
