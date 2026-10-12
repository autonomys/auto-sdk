import {
  getDeleted,
  getMe,
  getObject,
  getObjectMetadata,
  getObjectOwners,
  getObjectSummary,
  getObjectUploadStatus,
  getRoots,
  getSharedWithMe,
  getToBeReviewedList,
  searchByNameOrCID,
} from '../src/api/calls/read'
import { Scope } from '../src/api/models/objects'
import { AutoDriveApiHandler } from '../src/api/types'

const createMockApi = (mockFn: jest.Mock): AutoDriveApiHandler => ({
  sendAPIRequest: mockFn,
  sendDownloadRequest: jest.fn(),
  baseUrl: 'https://api.test',
  downloadBaseUrl: 'https://download.test',
})

const jsonResponse = (data: unknown, status = 200, statusText = 'OK') =>
  new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  })

const errorResponse = (status = 500, statusText = 'Internal Server Error') =>
  new Response('Error', { status, statusText })

describe('read API calls', () => {
  describe('getRoots', () => {
    it('sends correct GET request and returns paginated result', async () => {
      const mockResult = { rows: [{ cid: 'cid1' }], totalCount: 1 }
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockResult))
      const api = createMockApi(sendReq)

      const result = await getRoots(api, { scope: Scope.User, limit: 10, offset: 0 })

      expect(sendReq).toHaveBeenCalledWith('/objects/roots?scope=user&limit=10&offset=0', {
        method: 'GET',
      })
      expect(result).toEqual(mockResult)
    })

    it('throws formatted error on non-ok response', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(404, 'Not Found'))
      const api = createMockApi(sendReq)

      await expect(getRoots(api, { scope: Scope.User, limit: 10, offset: 0 })).rejects.toThrow(
        'Failed to get roots: 404 Not Found',
      )
    })
  })

  describe('getSharedWithMe', () => {
    it('sends correct request and returns shared roots', async () => {
      const mockResult = { rows: [], totalCount: 0 }
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockResult))
      const api = createMockApi(sendReq)

      const result = await getSharedWithMe(api, { limit: 5, offset: 15 })

      expect(sendReq).toHaveBeenCalledWith('/objects/roots/shared?limit=5&offset=15', {
        method: 'GET',
      })
      expect(result).toEqual(mockResult)
    })

    it('throws formatted error on failure', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(500, 'Server Error'))
      const api = createMockApi(sendReq)

      await expect(getSharedWithMe(api, { limit: 5, offset: 15 })).rejects.toThrow(
        'Failed to get shared with me: 500 Server Error',
      )
    })
  })

  describe('searchByNameOrCID', () => {
    it('encodes query parameters and returns search results', async () => {
      const mockResults = [{ cid: 'cid-search' }]
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockResults))
      const api = createMockApi(sendReq)

      const result = await searchByNameOrCID(api, { value: 'my file & test', scope: Scope.Global })

      expect(sendReq).toHaveBeenCalledWith(
        '/objects/search?cid=my%20file%20%26%20test&scope=global',
        {
          method: 'GET',
        },
      )
      expect(result).toEqual(mockResults)
    })

    it('throws formatted error on failure', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(400, 'Bad Request'))
      const api = createMockApi(sendReq)

      await expect(searchByNameOrCID(api, { value: 'test', scope: Scope.Global })).rejects.toThrow(
        'Failed to search by name or CID: 400 Bad Request',
      )
    })
  })

  describe('getDeleted', () => {
    it('sends correct request and returns deleted roots', async () => {
      const mockResult = { rows: [], totalCount: 0 }
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockResult))
      const api = createMockApi(sendReq)

      const result = await getDeleted(api, { limit: 20, offset: 0 })

      expect(sendReq).toHaveBeenCalledWith('/objects/roots/deleted?limit=20&offset=0', {
        method: 'GET',
      })
      expect(result).toEqual(mockResult)
    })

    it('throws formatted error on failure', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(403, 'Forbidden'))
      const api = createMockApi(sendReq)

      await expect(getDeleted(api, { limit: 20, offset: 0 })).rejects.toThrow(
        'Failed to get deleted: 403 Forbidden',
      )
    })
  })

  describe('getObject and getObjectSummary', () => {
    it('getObject requests /objects/:cid and returns object information', async () => {
      const mockObj = { cid: 'cid123', name: 'test.txt' }
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockObj))
      const api = createMockApi(sendReq)

      const result = await getObject(api, { cid: 'cid123' })

      expect(sendReq).toHaveBeenCalledWith('/objects/cid123', { method: 'GET' })
      expect(result).toEqual(mockObj)
    })

    it('getObject throws formatted error', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(404, ''))
      const api = createMockApi(sendReq)

      await expect(getObject(api, { cid: 'missing' })).rejects.toThrow('Failed to get object: 404')
    })

    it('getObjectSummary requests /objects/:cid/summary', async () => {
      const mockSummary = { cid: 'cid123', size: 1024 }
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockSummary))
      const api = createMockApi(sendReq)

      const result = await getObjectSummary(api, { cid: 'cid123' })

      expect(sendReq).toHaveBeenCalledWith('/objects/cid123/summary', { method: 'GET' })
      expect(result).toEqual(mockSummary)
    })

    it('getObjectSummary throws formatted error', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(502, 'Bad Gateway'))
      const api = createMockApi(sendReq)

      await expect(getObjectSummary(api, { cid: 'cid123' })).rejects.toThrow(
        'Failed to get object summary: 502 Bad Gateway',
      )
    })
  })

  describe('getObjectUploadStatus, getObjectOwners, getObjectMetadata', () => {
    it('getObjectUploadStatus requests /objects/:cid/status', async () => {
      const sendReq = jest.fn().mockResolvedValue(jsonResponse('completed'))
      const api = createMockApi(sendReq)

      const status = await getObjectUploadStatus(api, { cid: 'cid123' })

      expect(sendReq).toHaveBeenCalledWith('/objects/cid123/status', { method: 'GET' })
      expect(status).toBe('completed')
    })

    it('getObjectOwners requests /objects/:cid/owners', async () => {
      const mockOwners = ['user1', 'user2']
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockOwners))
      const api = createMockApi(sendReq)

      const owners = await getObjectOwners(api, { cid: 'cid123' })

      expect(sendReq).toHaveBeenCalledWith('/objects/cid123/owners', { method: 'GET' })
      expect(owners).toEqual(mockOwners)
    })

    it('getObjectMetadata requests /objects/:cid/metadata', async () => {
      const mockMeta = { name: 'test.png', size: 2048 }
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockMeta))
      const api = createMockApi(sendReq)

      const meta = await getObjectMetadata(api, { cid: 'cid123' })

      expect(sendReq).toHaveBeenCalledWith('/objects/cid123/metadata', { method: 'GET' })
      expect(meta).toEqual(mockMeta)
    })
  })

  describe('getMe', () => {
    it('requests /@me with leading slash and returns user info', async () => {
      const mockUser = {
        id: 'user-1',
        subscription: {
          pendingUploadCredits: 50,
          pendingDownloadCredits: 100,
        },
      }
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockUser))
      const api = createMockApi(sendReq)

      const user = await getMe(api)

      expect(sendReq).toHaveBeenCalledWith('/@me', { method: 'GET' })
      expect(user).toEqual(mockUser)
    })

    it('throws formatted error with status code on failure', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(401, 'Unauthorized'))
      const api = createMockApi(sendReq)

      await expect(getMe(api)).rejects.toThrow('Failed to get limits: 401 Unauthorized')
    })
  })

  describe('getToBeReviewedList', () => {
    it('requests /objects/to-be-reviewed/list with pagination', async () => {
      const mockList = [{ cid: 'flagged-1' }]
      const sendReq = jest.fn().mockResolvedValue(jsonResponse(mockList))
      const api = createMockApi(sendReq)

      const list = await getToBeReviewedList(api, { limit: 50, offset: 10 })

      expect(sendReq).toHaveBeenCalledWith('/objects/to-be-reviewed/list?limit=50&offset=10', {
        method: 'GET',
      })
      expect(list).toEqual(mockList)
    })

    it('throws formatted error on failure', async () => {
      const sendReq = jest.fn().mockResolvedValue(errorResponse(403, 'Forbidden'))
      const api = createMockApi(sendReq)

      await expect(getToBeReviewedList(api, { limit: 50, offset: 10 })).rejects.toThrow(
        'Failed to get to be reviewed list: 403 Forbidden',
      )
    })
  })
})
