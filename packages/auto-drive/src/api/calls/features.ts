import { FeatureFlags } from '../models/features'
import { AutoDriveApiHandler } from '../types'
import { toApiError } from './errors'

/**
 * Retrieves the feature flags configuration from the Auto Drive service.
 *
 * This endpoint allows clients to discover available capabilities (such as credit purchases,
 * USDC payments, and feature availability) before initiating actions.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @returns {Promise<FeatureFlags>} - A promise that resolves to the feature flags configuration.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getFeatureFlags = async (api: AutoDriveApiHandler): Promise<FeatureFlags> => {
  const response = await api.sendAPIRequest('/features', {
    method: 'GET',
  })

  if (!response.ok) {
    throw await toApiError(response, 'Failed to get feature flags')
  }

  return response.json()
}
