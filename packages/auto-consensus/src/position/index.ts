import type { Api } from '@autonomys/auto-utils'
import { domainStakingSummary } from '../domain'
import { deposits, operator, withdrawals } from '../staking'
import type { NominatorPosition } from '../types/position'
import { instantSharePrice, operatorEpochSharePrice } from './price'
import { shareToStake, stakeToShare } from './utils'

/**
 * High-level helper that returns the staking/storage position of a nominator inside an operator pool
 */
export const nominatorPosition = async (
  api: Api,
  operatorId: string | number | bigint,
  nominatorAccountId: string,
): Promise<NominatorPosition> => {
  try {
    const operatorData = await operator(api, operatorId)

    // Step 1: Get deposits, withdrawals, and domain staking summary
    const [depositsData, withdrawalsData, stakingSummary] = await Promise.all([
      deposits(api, operatorId, nominatorAccountId),
      withdrawals(api, operatorId, nominatorAccountId),
      domainStakingSummary(api, operatorData.currentDomainId),
    ])

    if (!stakingSummary) {
      throw new Error('Domain staking summary not found')
    }

    const depositData = depositsData.length > 0 ? depositsData[0] : null
    if (!depositData) {
      return {
        knownValue: BigInt(0),
        pendingDeposits: [],
        pendingWithdrawals: [],
        storageFeeDeposit: BigInt(0),
      }
    }
    const currentEpochIndex = stakingSummary.currentEpochIndex

    let totalShares = depositData.known.shares
    let totalStorageFeeDeposit =
      depositData.known.storageFeeDeposit + (depositData.pending?.storageFeeDeposit ?? BigInt(0))

    const pendingDeposits: NominatorPosition['pendingDeposits'] = []

    if (depositData.pending) {
      const {
        effectiveDomainEpoch,
        amount,
        storageFeeDeposit: pendingStorageFee,
      } = depositData.pending

      if (effectiveDomainEpoch <= currentEpochIndex) {
        // Epoch has passed - convert pending amount to shares using epoch share price
        try {
          const epochSharePrice = await operatorEpochSharePrice(
            api,
            operatorId,
            effectiveDomainEpoch,
            0,
          )

          if (epochSharePrice !== undefined) {
            // Convert pending amount to shares and add to total
            const pendingShares = stakeToShare(amount, epochSharePrice)
            totalShares += pendingShares
            console.log(
              `Converted pending deposit: ${amount} tokens at epoch ${effectiveDomainEpoch} (price: ${epochSharePrice}) = ${pendingShares} shares`,
            )
          } else {
            // Fallback: if no epoch price available, assume 1:1 conversion
            console.warn(
              `No epoch share price found for epoch ${effectiveDomainEpoch}, using pending amount as shares`,
            )
            totalShares += amount
          }

          // Add pending storage fee to total
          totalStorageFeeDeposit += pendingStorageFee
        } catch (error) {
          console.warn(
            `Error getting epoch share price for epoch ${effectiveDomainEpoch}, treating as still pending:`,
            error,
          )
          // Keep as pending if we can't get the epoch price
          pendingDeposits.push({
            amount: amount,
            effectiveEpoch: effectiveDomainEpoch,
          })
        }
      } else {
        // Epoch hasn't passed yet - keep as pending
        pendingDeposits.push({
          amount: amount,
          effectiveEpoch: effectiveDomainEpoch,
        })
      }
    }

    // Step 3: Calculate current position value using instant share price
    const currentSharePrice = await instantSharePrice(api, operatorId)
    const knownValue = shareToStake(totalShares, currentSharePrice)

    // Step 4: Process pending withdrawals
    const pendingWithdrawals: NominatorPosition['pendingWithdrawals'] = []
    if (withdrawalsData.length > 0) {
      for (const withdrawal of withdrawalsData) {
        // Process regular withdrawals
        for (const w of withdrawal.withdrawals) {
          pendingWithdrawals.push({
            amount: w.amountToUnlock,
            unlockAtBlock: w.unlockAtConfirmedDomainBlockNumber,
          })
        }

        // Process withdrawal in shares
        if (withdrawal.withdrawalInShares) {
          const sharePrice = await operatorEpochSharePrice(
            api,
            operatorId,
            withdrawal.withdrawalInShares.domainEpoch[1], // epoch index
            withdrawal.withdrawalInShares.domainEpoch[0], // domain id
          )

          const withdrawalAmount = sharePrice
            ? shareToStake(withdrawal.withdrawalInShares.shares, sharePrice)
            : BigInt(0) // fallback to 0 if no price available

          pendingWithdrawals.push({
            amount: withdrawalAmount,
            unlockAtBlock: withdrawal.withdrawalInShares.unlockAtConfirmedDomainBlockNumber,
          })
        }
      }
    }

    return {
      knownValue,
      pendingDeposits,
      pendingWithdrawals,
      storageFeeDeposit: totalStorageFeeDeposit,
    }
  } catch (error) {
    console.error('Error calculating nominator position:', error)
    throw new Error(
      `Error calculating position for nominator ${nominatorAccountId} in operator ${operatorId}: ${error}`,
    )
  }
}
