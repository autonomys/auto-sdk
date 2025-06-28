import type { Api } from '@autonomys/auto-utils'
import { domainStakingSummary } from '../domain'
import { deposits, operator, withdrawals } from '../staking'
import type { NominatorPosition } from '../types/position'
import type { Deposit, Withdrawal } from '../types/staking'
import { instantSharePrice, operatorEpochSharePrice } from './price'
import { shareToStake, stakeToShare } from './utils'

/**
 * Processes pending deposits to calculate additional shares and storage fees
 */
const processPendingDeposits = async (
  api: Api,
  operatorId: string | number | bigint,
  depositData: Deposit,
  currentEpochIndex: number,
) => {
  const zeroAmounts = {
    additionalShares: BigInt(0),
    additionalStorageFee: BigInt(0),
    pendingDeposits: [] as NominatorPosition['pendingDeposits'],
  }

  if (!depositData.pending) return zeroAmounts

  const {
    effectiveDomainEpoch,
    amount,
    storageFeeDeposit: additionalStorageFee,
  } = depositData.pending

  // If epoch hasn't passed yet, keep as pending
  if (effectiveDomainEpoch >= currentEpochIndex) {
    return {
      ...zeroAmounts,
      pendingDeposits: [{ amount, effectiveEpoch: effectiveDomainEpoch }],
    }
  }

  // Epoch has passed - convert pending amount to shares
  try {
    const epochSharePrice = await operatorEpochSharePrice(api, operatorId, effectiveDomainEpoch, 0)
    const additionalShares =
      epochSharePrice !== undefined ? stakeToShare(amount, epochSharePrice) : amount // Fallback: assume 1:1 conversion

    if (epochSharePrice === undefined) {
      console.warn(
        `No epoch share price found for epoch ${effectiveDomainEpoch}, using pending amount as is`,
      )
    }

    return {
      additionalShares,
      additionalStorageFee,
      pendingDeposits: [],
    }
  } catch (error) {
    console.warn(
      `Error getting epoch share price for epoch ${effectiveDomainEpoch}, treating as still pending:`,
      error,
    )
    return {
      ...zeroAmounts,
      pendingDeposits: [{ amount, effectiveEpoch: effectiveDomainEpoch }],
    }
  }
}

/**
 * Processes pending withdrawals to calculate withdrawal amounts and unlock blocks
 */
const processPendingWithdrawals = async (
  api: Api,
  operatorId: string | number | bigint,
  withdrawalsData: Withdrawal[],
  currentEpochIndex: number,
): Promise<NominatorPosition['pendingWithdrawals']> => {
  const pendingWithdrawals: NominatorPosition['pendingWithdrawals'] = []

  if (withdrawalsData.length === 0) return pendingWithdrawals

  for (const withdrawal of withdrawalsData) {
    const { withdrawalInShares } = withdrawal

    // Skip if no withdrawalInShares
    if (!withdrawalInShares) continue

    const { domainEpoch, shares, unlockAtConfirmedDomainBlockNumber } = withdrawalInShares

    // Process regular withdrawals
    for (const w of withdrawal.withdrawals) {
      pendingWithdrawals.push({
        amount: w.amountToUnlock,
        unlockAtDomainBlock: w.unlockAtConfirmedDomainBlockNumber,
      })
    }

    const sharePrice =
      // If withdrawal epoch has passed, us its share price, otherwise use instant share price
      domainEpoch[1] < currentEpochIndex
        ? await operatorEpochSharePrice(
            api,
            operatorId,
            domainEpoch[1], // epoch index
            domainEpoch[0], // domain id
          )
        : await instantSharePrice(api, operatorId)

    const withdrawalAmount = sharePrice ? shareToStake(shares, sharePrice) : BigInt(0) // fallback to 0 if no price available

    pendingWithdrawals.push({
      amount: withdrawalAmount,
      unlockAtDomainBlock: unlockAtConfirmedDomainBlockNumber,
    })
  }

  return pendingWithdrawals
}

/**
 * Retrieves the complete staking position of a nominator for a specific operator.
 *
 * This function calculates the comprehensive staking position of a nominator including
 * current value, pending deposits, pending withdrawals, and storage fee deposits.
 * It handles complex calculations involving share prices across different epochs
 * and provides a complete view of the nominator's stake position.
 *
 * @param api - The connected API instance
 * @param operatorId - The ID of the operator to query position for
 * @param nominatorAccountId - The account ID of the nominator
 * @returns Promise that resolves to NominatorPosition with complete position details
 * @throws Error if operator not found, domain staking summary unavailable, or calculation fails
 *
 * @example
 * ```typescript
 * import { nominatorPosition } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'gemini-3h' })
 * const position = await nominatorPosition(api, '1', 'nominator_account_address')
 *
 * console.log(`Current Value: ${position.knownValue}`)
 * console.log(`Storage Fee Deposit: ${position.storageFeeDeposit}`)
 * console.log(`Pending Deposits: ${position.pendingDeposits.length}`)
 * console.log(`Pending Withdrawals: ${position.pendingWithdrawals.length}`)
 *
 * // Check pending deposits
 * position.pendingDeposits.forEach(deposit => {
 *   console.log(`Pending: ${deposit.amount} at epoch ${deposit.effectiveEpoch}`)
 * })
 *
 * // Check pending withdrawals
 * position.pendingWithdrawals.forEach(withdrawal => {
 *   console.log(`Withdrawal: ${withdrawal.amount} unlocks at block ${withdrawal.unlockAtBlock}`)
 * })
 * ```
 */
export const nominatorPosition = async (
  api: Api,
  operatorId: string | number | bigint,
  nominatorAccountId: string,
): Promise<NominatorPosition> => {
  try {
    // TODO: handle when operator is not found
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

    // Find the deposit data for the operator
    const depositData = depositsData.find((d) => d.operatorId === operatorId)
    if (!depositData) {
      return {
        knownValue: BigInt(0),
        pendingDeposits: [],
        pendingWithdrawals: [],
        storageFeeDeposit: BigInt(0),
      }
    }
    const { currentEpochIndex } = stakingSummary

    // Process pending deposits
    const { additionalShares, additionalStorageFee, pendingDeposits } =
      await processPendingDeposits(api, operatorId, depositData, currentEpochIndex)

    // Calculate final totals functionally
    const totalShares = depositData.known.shares + additionalShares
    const totalStorageFeeDeposit =
      depositData.known.storageFeeDeposit +
      (depositData.pending?.storageFeeDeposit ?? BigInt(0)) +
      additionalStorageFee

    // Calculate current position value
    const currentSharePrice = await instantSharePrice(api, operatorId)
    const knownValue = shareToStake(totalShares, currentSharePrice)

    // Process pending withdrawals
    const pendingWithdrawals = await processPendingWithdrawals(
      api,
      operatorId,
      withdrawalsData,
      currentEpochIndex,
    )

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
