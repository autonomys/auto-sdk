import { ArgsWithoutPagination } from '../../utils/types';
import { AutoDriveApi } from '../connection';

/**
 * Shares an object with a specified public ID.
 *
 * This function sends a request to the server to share an object identified
 * by its CID. The object will be shared with the provided public ID, allowing
 * access to the object for users with that ID.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ cid: string; publicId: string }>} query - The query parameters containing the CID of the object to share and the public ID to share it with.
 * @returns {Promise<any>} - A promise that resolves to the response from the server.
 * @throws {Error} - Throws an error if the sharing process fails.
 */
export const shareObject = async (
  api: AutoDriveApi,
  query: ArgsWithoutPagination<{ cid: string; publicId: string }>,
) => {
  const response = await api.sendRequest(
    `/objects/${query.cid}/share`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    },
    JSON.stringify({ publicId: query.publicId }),
  )

  if (!response.ok) {
    throw new Error(`Failed to share object: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Marks an object as deleted by sending a request to the server.
 *
 * This function sends a request to the server to mark an object identified
 * by its CID as deleted. This action is typically irreversible and should
 * be used with caution.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ cid: string }>} query - The query parameters containing the CID of the object to mark as deleted.
 * @returns {Promise<void>} - A promise that resolves when the object has been marked as deleted.
 * @throws {Error} - Throws an error if the marking process fails.
 */
export const markObjectAsDeleted = async (
  api: AutoDriveApi,
  query: ArgsWithoutPagination<{ cid: string }>,
): Promise<void> => {
  const response = await api.sendRequest(`/objects/${query.cid}/delete`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to mark object as deleted: ${response.statusText}`)
  }
}

/**
 * Restores an object that has been marked as deleted by sending a request to the server.
 *
 * This function sends a request to the server to restore an object identified
 * by its CID. The restoration process may depend on the server's implementation
 * and the object's current state.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ cid: string }>} query - The query parameters containing the CID of the object to restore.
 * @returns {Promise<void>} - A promise that resolves when the object has been successfully restored.
 * @throws {Error} - Throws an error if the restoration process fails.
 */
export const restoreObject = async (
  api: AutoDriveApi,
  query: ArgsWithoutPagination<{ cid: string }>,
): Promise<void> => {
  const response = await api.sendRequest(`/objects/${query.cid}/restore`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to restore object: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Publishes an object by sending a request to the server.
 *
 * This function sends a request to the server to publish an object identified
 * by its CID. The publication process may depend on the server's implementation
 * and the object's current state.
 *
 * @param {AutoDriveApi} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ cid: string }>} query - The query parameters containing the CID of the object to publish.
 * @returns {Promise<void>} - A promise that resolves when the object has been successfully published.
 * @throws {Error} - Throws an error if the publication process fails.
 */
export const publishObject = async (
  api: AutoDriveApi,
  query: ArgsWithoutPagination<{ cid: string }>,
): Promise<{ result: string }> => {
  const response = await api.sendRequest(`/objects/${query.cid}/publish`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to publish object: ${response.statusText}`)
  }

  return response.json()
}
