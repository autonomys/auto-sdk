import { ArgsWithoutPagination, ArgsWithPagination } from '../../utils/types'
import { PaginatedResult } from '../models/common'
import { ObjectInformation, ObjectSearchResult, ObjectSummary, Scope } from '../models/objects'
import { UserInfo } from '../models/user'
import { AutoDriveApiHandler } from '../types'

/**
 * Retrieves the root objects based on the specified scope.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithPagination<{ scope: Scope }>} query - The query parameters including scope, limit, and offset.
 * @returns {Promise<ObjectSummary[]>} - A promise that resolves to an array of ObjectSummary representing the root objects.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getRoots = async (
  api: AutoDriveApiHandler,
  query: ArgsWithPagination<{ scope: Scope }>,
): Promise<PaginatedResult<ObjectSummary>> => {
  const response = await api.sendAPIRequest(
    `/objects/roots?scope=${query.scope}&limit=${query.limit}&offset=${query.offset}`,
    {
      method: 'GET',
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to get roots: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Retrieves the objects that have been shared with the authenticated user.
 *
 * This method sends a request to the server to fetch a list of objects
 * that are shared with the user, based on the specified pagination parameters.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithPagination} query - The query parameters including limit and offset for pagination.
 * @returns {Promise<ObjectSummary[]>} - A promise that resolves to an array of ObjectSummary representing the shared objects.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getSharedWithMe = async (
  api: AutoDriveApiHandler,
  query: ArgsWithPagination,
): Promise<PaginatedResult<ObjectSummary>> => {
  const response = await api.sendAPIRequest(
    `/objects/roots/shared?limit=${query.limit}&offset=${query.offset}`,
    {
      method: 'GET',
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to get shared with me: ${response.statusText}`)
  }

  return response.json()
}

export const searchByNameOrCID = async (
  api: AutoDriveApiHandler,
  query: ArgsWithoutPagination<{ value: string; scope: Scope }>,
): Promise<ObjectSearchResult[]> => {
  const response = await api.sendAPIRequest(
    `/objects/search?cid=${encodeURIComponent(query.value)}&scope=${query.scope}`,
    {
      method: 'GET',
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to search by name or CID: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Retrieves the objects that have been marked as deleted.
 *
 * This method sends a request to the server to fetch a list of objects
 * that have been deleted, based on the specified pagination parameters.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithPagination} query - The query parameters including limit and offset for pagination.
 * @returns {Promise<ObjectSummary[]>} - A promise that resolves to an array of ObjectSummary representing the deleted objects.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getDeleted = async (
  api: AutoDriveApiHandler,
  query: ArgsWithPagination,
): Promise<PaginatedResult<ObjectSummary>> => {
  const response = await api.sendAPIRequest(
    `/objects/roots/deleted?limit=${query.limit}&offset=${query.offset}`,
    {
      method: 'GET',
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to get deleted: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Retrieves the aggregated information of a specific object identified by its CID.
 *
 * This method sends a request to the server to fetch details about the
 * object, including its metadata and other relevant information.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ cid: string }>} query - The query parameters containing the CID of the object to retrieve.
 * @returns {Promise<ObjectInformation>} - A promise that resolves to the information of the requested object.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getObject = async (
  api: AutoDriveApiHandler,
  query: ArgsWithoutPagination<{ cid: string }>,
): Promise<ObjectInformation> => {
  const response = await api.sendAPIRequest(`/objects/${query.cid}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get object: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Retrieves the summary of a specific object identified by its CID.
 *
 * This method sends a request to the server to fetch the summary of the object.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ cid: string }>} query - The query parameters containing the CID of the object whose upload status is to be retrieved.
 * @returns {Promise<ObjectSummary>} - A promise that resolves to the summary of the requested object.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getObjectSummary = async (
  api: AutoDriveApiHandler,
  query: ArgsWithoutPagination<{ cid: string }>,
): Promise<ObjectSummary> => {
  const response = await api.sendAPIRequest(`/objects/${query.cid}/summary`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get object summary: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Retrieves the upload status of a specific object identified by its CID.
 *
 * This method sends a request to the server to fetch the current upload status
 * of the object, which can indicate whether the upload is pending, completed,
 * or failed.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ cid: string }>} query - The query parameters containing the CID of the object whose upload status is to be retrieved.
 * @returns {Promise<ObjectInformation['uploadStatus']>} - A promise that resolves to the upload status of the requested object.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getObjectUploadStatus = async (
  api: AutoDriveApiHandler,
  query: ArgsWithoutPagination<{ cid: string }>,
): Promise<ObjectInformation['uploadStatus']> => {
  const response = await api.sendAPIRequest(`/objects/${query.cid}/status`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get object: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Retrieves the owners of a specific object identified by its CID.
 *
 * This method sends a request to the server to fetch the list of owners
 * associated with the object. The owners can provide insights into who
 * has access to or control over the object.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ cid: string }>} query - The query parameters containing the CID of the object whose owners are to be retrieved.
 * @returns {Promise<ObjectInformation['owners']>} - A promise that resolves to the list of owners of the requested object.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getObjectOwners = async (
  api: AutoDriveApiHandler,
  query: ArgsWithoutPagination<{ cid: string }>,
): Promise<ObjectInformation['owners']> => {
  const response = await api.sendAPIRequest(`/objects/${query.cid}/owners`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get object: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Retrieves the metadata of a specific object identified by its CID.
 *
 * This method sends a request to the server to fetch the metadata associated
 * with the object. The metadata can include various details about the object,
 * such as its name, type, size, and other relevant information.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ cid: string }>} query - The query parameters containing the CID of the object whose metadata is to be retrieved.
 * @returns {Promise<ObjectInformation['metadata']>} - A promise that resolves to the metadata of the requested object.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getObjectMetadata = async (
  api: AutoDriveApiHandler,
  query: ArgsWithoutPagination<{ cid: string }>,
): Promise<ObjectInformation['metadata']> => {
  const response = await api.sendAPIRequest(`/objects/${query.cid}/metadata`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get object: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get upload and download limits of the user
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @returns {Promise<UserInfo>} - A promise that resolves to the user info.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getMe = async (api: AutoDriveApiHandler): Promise<UserInfo> => {
  const response = await api.sendAPIRequest('@me', {
    method: 'GET',
  })
  if (!response.ok) {
    throw new Error(`Failed to get limits: ${response.statusText}`)
  }

  return response.json()
}
