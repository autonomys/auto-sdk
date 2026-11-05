import { ArgsWithoutPagination } from '../../utils/types'
import { Banner, BannerInteractionType } from '../models/banners'
import { AutoDriveApiHandler } from '../types'
import { toApiError } from './errors'

/**
 * Retrieves the active banners for the current authenticated user.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @returns {Promise<Banner[]>} - A promise that resolves to an array of active banners.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getActiveBanners = async (api: AutoDriveApiHandler): Promise<Banner[]> => {
  const response = await api.sendAPIRequest('/banners/active', {
    method: 'GET',
  })

  if (!response.ok) {
    throw await toApiError(response, 'Failed to get active banners')
  }

  return response.json()
}

/**
 * Records a user interaction (acknowledge or dismiss) with a banner.
 *
 * @param {AutoDriveApiHandler} api - The API instance used to send requests.
 * @param {ArgsWithoutPagination<{ bannerId: string; type: BannerInteractionType }>} args - The banner ID and interaction type.
 * @returns {Promise<void>} - A promise that resolves when the interaction is recorded.
 * @throws {Error} - Throws an error if the interaction fails or inputs are invalid.
 */
export const interactWithBanner = async (
  api: AutoDriveApiHandler,
  {
    bannerId,
    type,
  }: ArgsWithoutPagination<{
    bannerId: string
    type: BannerInteractionType
  }>,
): Promise<void> => {
  if (!bannerId || typeof bannerId !== 'string') {
    throw new Error('bannerId must be a non-empty string')
  }

  if (type !== BannerInteractionType.Acknowledged && type !== BannerInteractionType.Dismissed) {
    throw new Error(
      `Invalid banner interaction type: "${type}". Must be "${BannerInteractionType.Acknowledged}" or "${BannerInteractionType.Dismissed}".`,
    )
  }

  const response = await api.sendAPIRequest(
    `/banners/${encodeURIComponent(bannerId)}/interact`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    },
    JSON.stringify({ type }),
  )

  if (!response.ok) {
    throw await toApiError(response, 'Failed to record banner interaction')
  }
}
