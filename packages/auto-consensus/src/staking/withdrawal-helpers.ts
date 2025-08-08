import type { ApiPromise } from '@autonomys/auto-utils'
import { nominatorPosition } from '../position'
import { withdrawStake } from './staking'
import type { StringNumberOrBigInt } from '../types/staking'
import { parseString } from '../utils/parse'

/**
 * Parameters to withdraw all stake for an account on an operator.
 */
export type WithdrawStakeAllParams = {
  /** Connected API instance */
  api: ApiPromise
  /** Operator ID to withdraw from */
  operatorId: StringNumberOrBigInt
  /** Nominator account ID whose stake is being withdrawn */
  account: string
}

/**
 * Parameters to withdraw a percentage of the current stake (rounded down in shares).
 */
export type WithdrawStakeByPercentParams = {
  /** Connected API instance */
  api: ApiPromise
  /** Operator ID to withdraw from */
  operatorId: StringNumberOrBigInt
  /** Nominator account ID whose stake is being withdrawn */
  account: string
  /** Percent in range 0..100 (values are clamped, shares are rounded down) */
  percent: StringNumberOrBigInt // 0..100
}

/**
 * Parameters to withdraw a target value amount (in balance units, not shares).
 * The helper computes the equivalent shares using the current position.
 */
export type WithdrawStakeByValueParams = {
  /** Connected API instance */
  api: ApiPromise
  /** Operator ID to withdraw from */
  operatorId: StringNumberOrBigInt
  /** Nominator account ID whose stake is being withdrawn */
  account: string
  /** Target amount to withdraw in balance units (will be capped at current value) */
  amountToWithdraw: StringNumberOrBigInt // balance units
}

const clampPercent = (percent: bigint): bigint => {
  if (percent < BigInt(0)) return BigInt(0)
  if (percent > BigInt(100)) return BigInt(100)
  return percent
}

/**
 * Creates a submittable extrinsic to withdraw ALL stake for a nominator on a given operator.
 *
 * This is a convenience wrapper that:
 * 1) Fetches the nominator position to obtain totalShares
 * 2) Calls protocol-native withdrawStake({ shares: totalShares })
 *
 * Edge cases:
 * - Throws if the nominator has no shares
 *
 * @param params - {@link WithdrawStakeAllParams}
 * @returns A submittable extrinsic prepared for submission
 */
export const withdrawStakeAll = async (params: WithdrawStakeAllParams) => {
  const { api, operatorId, account } = params
  const position = await nominatorPosition(api, operatorId, account)
  const totalShares = position.totalShares

  if (totalShares === BigInt(0)) throw new Error('No shares to withdraw for the given account')

  return withdrawStake({ api, operatorId, shares: totalShares })
}

/**
 * Creates a submittable extrinsic to withdraw a percentage of the current stake.
 *
 * Share calculation:
 * shares = floor(totalShares * clamp(percent, 0..100) / 100)
 *
 * Edge cases:
 * - Percent is clamped to [0, 100]
 * - Throws if computed shares is zero
 * - Throws if the nominator has no shares
 *
 * @param params - {@link WithdrawStakeByPercentParams}
 * @returns A submittable extrinsic prepared for submission
 */
export const withdrawStakeByPercent = async (params: WithdrawStakeByPercentParams) => {
  const { api, operatorId, account } = params
  const rawPercent = BigInt(parseString(params.percent))
  const percent = clampPercent(rawPercent)

  const position = await nominatorPosition(api, operatorId, account)
  const totalShares = position.totalShares

  if (totalShares === BigInt(0)) throw new Error('No shares to withdraw for the given account')

  const shares = (totalShares * percent) / BigInt(100)

  if (shares === BigInt(0)) throw new Error('Computed zero shares to withdraw; increase percent')

  return withdrawStake({ api, operatorId, shares })
}

/**
 * Creates a submittable extrinsic to withdraw a target value (in balance units) from the current stake.
 *
 * Share calculation (using floor):
 * shares = floor(min(requestedAmount, currentStakedValue) * totalShares / currentStakedValue)
 *
 * Edge cases:
 * - Throws if amountToWithdraw <= 0
 * - Caps requested amount to currentStakedValue
 * - Throws if currentStakedValue is zero
 * - Throws if computed shares is zero
 * - Throws if the nominator has no shares
 *
 * @param params - {@link WithdrawStakeByValueParams}
 * @returns A submittable extrinsic prepared for submission
 */
export const withdrawStakeByValue = async (params: WithdrawStakeByValueParams) => {
  const { api, operatorId, account } = params
  const requestedAmount = BigInt(parseString(params.amountToWithdraw))

  if (requestedAmount <= BigInt(0)) throw new Error('amountToWithdraw must be greater than zero')

  const position = await nominatorPosition(api, operatorId, account)
  const { totalShares, currentStakedValue } = position

  if (totalShares === BigInt(0)) throw new Error('No shares to withdraw for the given account')
  if (currentStakedValue === BigInt(0))
    throw new Error('Current staked value is zero; cannot compute shares')

  const effectiveAmount =
    requestedAmount > currentStakedValue ? currentStakedValue : requestedAmount

  const shares = (effectiveAmount * totalShares) / currentStakedValue

  if (shares === BigInt(0))
    throw new Error('Computed zero shares to withdraw; requested amount too small for current price')

  return withdrawStake({ api, operatorId, shares })
}