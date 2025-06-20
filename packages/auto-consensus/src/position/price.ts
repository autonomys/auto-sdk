import type { Api } from '@autonomys/auto-utils'
import { domainStakingSummary } from '../domain'
import { operator } from '../staking'
import { parseString } from '../utils/parse'

/**
 * Fetch the stored share price (18-dec Perbill) for a given (operatorId, domainEpoch) tuple
 * Returns undefined if no price is stored for that epoch (i.e. no staking activity)
 */
export const operatorEpochSharePrice = async (
  api: Api,
  operatorId: string | number | bigint,
  domainEpoch: string | number | bigint,
  domainId: string | number | bigint = 0, // Default to domain 0
): Promise<bigint | undefined> => {
  try {
    // Create domain epoch tuple [domainId, epochIndex]
    const domainEpochTuple = [parseString(domainId), parseString(domainEpoch)]

    const sharePrice = await api.query.domains.operatorEpochSharePrice(
      parseString(operatorId),
      domainEpochTuple,
    )

    if (sharePrice.isEmpty) {
      return undefined
    }

    // The response is a direct Perbill value, not an object
    const priceValue = sharePrice.toJSON() as number | string | null
    if (priceValue === null || priceValue === undefined) {
      return undefined
    }

    // Convert to bigint - the value is already in Perbill format but needs to be scaled to 18 decimals
    // The raw value from chain is in parts per billion (9 decimals), we need 18 decimals
    const perbillValue = BigInt(priceValue.toString())
    const scaledPrice = perbillValue * BigInt(10 ** 9) // Scale from 9 to 18 decimals

    // Invert the share price: if API returns 0.5601 (shares worth 56% of original),
    // we need 1/0.5601 ≈ 1.785 for stakeToShare conversion
    const oneInPerbill = BigInt(10 ** 18)
    return (oneInPerbill * oneInPerbill) / scaledPrice
  } catch (error) {
    console.error('Error fetching operator epoch share price:', error)
    throw new Error(
      `Error fetching share price for operator ${operatorId} at epoch ${domainEpoch}: ${error}`,
    )
  }
}

/**
 * Compute the on-the-fly share price for the operator in the current domain epoch
 * Formula: (currentTotalStake + currentEpochReward * (1 - nominationTax)) / currentTotalShares
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
      return BigInt(10 ** 18) // Return 1.0 in Perbill format
    }

    // Return price in 18-decimal Perbill format
    return (effectiveStake * BigInt(10 ** 18)) / currentTotalShares
  } catch (error) {
    console.error('Error computing instant share price:', error)
    throw new Error(`Error computing instant share price for operator ${operatorId}: ${error}`)
  }
}
