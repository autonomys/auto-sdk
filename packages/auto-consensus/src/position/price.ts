import type { Api } from '@autonomys/auto-utils'
import { domainStakingSummary } from '../domain'
import { operator } from '../staking/staking'
import { parseString } from '../utils/parse'
import { getOperatorEpochSharePrice } from '../utils/storage'

/**
 * Retrieves the stored share price for a specific operator at a given domain epoch.
 *
 * This function fetches the historical share price that was recorded for an operator
 * at a specific domain epoch. Share prices are stored when staking activity occurs
 * and are used to convert between stake amounts and shares at different points in time.
 * The price is returned in 18-decimal Perquintill format.
 *
 * @param api - The connected API instance
 * @param operatorId - The ID of the operator to query price for
 * @param domainEpoch - The domain epoch index to query price for
 * @param domainId - The domain ID (default: 0)
 * @returns Promise that resolves to share price in 18-decimal Perquintill format, or undefined if no price stored
 * @throws Error if the query fails or operator/epoch not found
 *
 * @example
 * ```typescript
 * import { operatorEpochSharePrice } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'taurus' })
 *
 * // Get share price for operator 1 at epoch 100
 * const sharePrice = await operatorEpochSharePrice(api, '1', 100, 0)
 *
 * if (sharePrice) {
 *   console.log(`Share price at epoch 100: ${sharePrice}`)
 *   // Use for stake/share conversions at that epoch
 * } else {
 *   console.log('No share price recorded for that epoch')
 * }
 * ```
 */
export const operatorEpochSharePrice = async (
  api: Api,
  operatorId: string | number | bigint,
  domainEpoch: string | number | bigint,
  domainId: string | number | bigint = 0,
): Promise<bigint | undefined> => {
  try {
    const sharePrice = await getOperatorEpochSharePrice(
      api,
      parseString(operatorId),
      domainId,
      domainEpoch,
    )

    if (sharePrice === undefined) {
      return undefined
    }

    const perquintillValue = sharePrice

    if (perquintillValue === BigInt(0)) {
      return undefined
    }

    const one = BigInt('1000000000000000000')
    return (one * one) / perquintillValue
  } catch (error) {
    console.error('Error fetching operator epoch share price:', error)
    throw new Error(
      `Error fetching share price for operator ${operatorId} at epoch ${domainEpoch}: ${error}`,
    )
  }
}

/**
 * Calculates the current real-time share price for an operator.
 *
 * This function computes the current share price by considering the operator's
 * total stake, current epoch rewards (after nomination tax), and total shares.
 * The calculation provides an up-to-date price that reflects recent staking
 * activity and rewards distribution.
 *
 * Formula: (currentTotalStake + currentEpochReward * (1 - nominationTax)) / currentTotalShares
 *
 * @param api - The connected API instance
 * @param operatorId - The ID of the operator to calculate price for
 * @returns Promise that resolves to current share price in 18-decimal Perquintill format
 * @throws Error if operator not found, domain staking summary unavailable, or calculation fails
 *
 * @example
 * ```typescript
 * import { instantSharePrice } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'taurus' })
 *
 * // Get current share price for operator 1
 * const currentPrice = await instantSharePrice(api, '1')
 * console.log(`Current share price: ${currentPrice}`)
 *
 * // Use for real-time stake/share conversions
 * const stakeAmount = BigInt('1000000000000000000') // 1 AI3
 * const sharesEquivalent = (stakeAmount * BigInt(10 ** 18)) / currentPrice
 * console.log(`${stakeAmount} stake = ${sharesEquivalent} shares`)
 * ```
 */
export const instantSharePrice = async (
  api: Api,
  operatorId: string | number | bigint,
): Promise<bigint> => {
  try {
    // Get operator details
    const operatorDetails = await operator(api, operatorId)
    const { currentTotalStake, currentTotalShares, nominationTax, currentDomainId } =
      operatorDetails

    // Get domain staking summary to find current epoch rewards
    const domainSummary = await domainStakingSummary(api, currentDomainId)

    if (!domainSummary) {
      throw new Error(`No staking summary found for domain ${currentDomainId}`)
    }

    // Get current epoch reward for this operator
    const currentEpochReward = domainSummary.currentEpochRewards[parseString(operatorId)]
    const rewardBigInt = currentEpochReward ? BigInt(currentEpochReward) : BigInt(0)

    // Calculate effective stake: currentTotalStake + currentEpochReward * (1 - nominationTax)
    const rewardAfterTax = (rewardBigInt * BigInt(100 - nominationTax)) / BigInt(100)
    const effectiveStake = currentTotalStake + rewardAfterTax

    // Avoid division by zero
    if (currentTotalShares === BigInt(0)) {
      return BigInt(10 ** 18) // Return 1.0 in Perquintill format
    }

    // Return price in 18-decimal Perquintill format
    return (effectiveStake * BigInt(10 ** 18)) / currentTotalShares
  } catch (error) {
    console.error('Error computing instant share price:', error)
    throw new Error(`Error computing instant share price for operator ${operatorId}: ${error}`)
  }
}
