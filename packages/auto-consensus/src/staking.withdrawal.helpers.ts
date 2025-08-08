import type { ApiPromise } from '@autonomys/auto-utils'
import { nominatorPosition } from './position'
import { withdrawStake } from './staking'
import type { StringNumberOrBigInt } from './types/staking'
import { parseString } from './utils/parse'

export type WithdrawStakeAllParams = {
  api: ApiPromise
  operatorId: StringNumberOrBigInt
  account: string
}

export type WithdrawStakeByPercentParams = {
  api: ApiPromise
  operatorId: StringNumberOrBigInt
  account: string
  percent: StringNumberOrBigInt // 0..100
}

export type WithdrawStakeByValueParams = {
  api: ApiPromise
  operatorId: StringNumberOrBigInt
  account: string
  amountToWithdraw: StringNumberOrBigInt // balance units
}

const clampPercent = (percent: bigint): bigint => {
  if (percent < BigInt(0)) return BigInt(0)
  if (percent > BigInt(100)) return BigInt(100)
  return percent
}

/**
 * Withdraw all stake for an account on an operator by converting all shares into a withdrawal.
 * Returns a submittable extrinsic.
 */
export const withdrawStakeAll = async (params: WithdrawStakeAllParams) => {
  const { api, operatorId, account } = params
  const position = await nominatorPosition(api, operatorId, account)
  const totalShares = position.totalShares

  if (totalShares === BigInt(0)) throw new Error('No shares to withdraw for the given account')

  return withdrawStake({ api, operatorId, shares: totalShares })
}

/**
 * Withdraw a percentage of the current stake (rounded down in shares). Returns a submittable extrinsic.
 */
export const withdrawStakeByPercent = async (params: WithdrawStakeByPercentParams) => {
  const { api, operatorId, account } = params
  const rawPercent = BigInt(parseString(params.percent))
  const percent = clampPercent(rawPercent)

  const position = await nominatorPosition(api, operatorId, account)
  const totalShares = position.totalShares

  if (totalShares === BigInt(0)) throw new Error('No shares to withdraw for the given account')

  // shares = floor(totalShares * percent / 100)
  const shares = (totalShares * percent) / BigInt(100)

  if (shares === BigInt(0)) throw new Error('Computed zero shares to withdraw; increase percent')

  return withdrawStake({ api, operatorId, shares })
}

/**
 * Withdraw an approximate balance amount (in tokens). Computes the corresponding shares using
 * the current position and rounds down. Returns a submittable extrinsic.
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

  // shares = floor(min(requestedAmount, currentStakedValue) * totalShares / currentStakedValue)
  const shares = (effectiveAmount * totalShares) / currentStakedValue

  if (shares === BigInt(0))
    throw new Error('Computed zero shares to withdraw; requested amount too small for current price')

  return withdrawStake({ api, operatorId, shares })
}