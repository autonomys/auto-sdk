import type { Api } from '@autonomys/auto-utils'
import type { NominatorPosition } from '../types/position'
import { parseString } from '../utils/parse'
import {
  convertRuntimePosition,
  createEmptyPosition,
  type RuntimeNominatorPositionResponse,
} from './runtime'

/**
 * Retrieves the complete staking position of a nominator for a specific operator.
 *
 * This function uses the runtime API to get the comprehensive staking position of a nominator
 * including current value, pending deposits, pending withdrawals, and storage fee deposits.
 * The runtime API handles all complex calculations involving share prices across different
 * epochs and provides a complete view of the nominator's stake position.
 *
 * @param api - The connected API instance
 * @param operatorId - The ID of the operator to query position for
 * @param nominatorAccountId - The account ID of the nominator
 * @returns Promise that resolves to NominatorPosition with complete position details
 * @throws Error if the runtime API call fails or position cannot be determined
 *
 * @example
 * ```typescript
 * import { nominatorPosition } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'gemini-3h' })
 * const position = await nominatorPosition(api, '1', 'nominator_account_address')
 *
 * console.log(`Current Staked Value: ${position.currentStakedValue}`)
 * console.log(`Total Shares: ${position.totalShares}`)
 * console.log(`Storage Fee Deposit: ${position.storageFeeDeposit.currentValue}`)
 * console.log(`Pending Deposit: ${position.pendingDeposit ? 'Yes' : 'No'}`)
 * console.log(`Pending Withdrawals: ${position.pendingWithdrawals.length}`)
 *
 * // Check pending deposit
 * if (position.pendingDeposit) {
 *   console.log(`Pending: ${position.pendingDeposit.amount} at epoch ${position.pendingDeposit.effectiveEpoch}`)
 * }
 *
 * // Check pending withdrawals
 * position.pendingWithdrawals.forEach(withdrawal => {
 *   console.log(`Withdrawal: ${withdrawal.stakeWithdrawalAmount} unlocks at block ${withdrawal.unlockAtBlock}`)
 * })
 * ```
 */
export const nominatorPosition = async (
  api: Api,
  operatorId: string | number | bigint,
  nominatorAccountId: string,
): Promise<NominatorPosition> => {
  try {
    // Call the runtime API to get the nominator position
    const position = (await api.call.domainsApi.nominatorPosition(
      parseString(operatorId),
      nominatorAccountId,
    )) as RuntimeNominatorPositionResponse

    if (position.isNone) {
      // No position exists for this nominator with this operator
      return createEmptyPosition()
    }

    const runtimePosition = position.unwrap()
    return convertRuntimePosition(runtimePosition)
  } catch (error) {
    console.error('Error fetching nominator position:', error)
    throw new Error(
      `Error fetching position for nominator ${nominatorAccountId} in operator ${operatorId}: ${error}`,
    )
  }
}
