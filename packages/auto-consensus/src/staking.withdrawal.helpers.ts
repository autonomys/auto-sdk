import { nominatorPosition } from './position'
import { withdrawStake } from './staking'
import type { StringNumberOrBigInt } from './types/staking'

const toStringVal = (v: StringNumberOrBigInt): string =>
  typeof v === 'string' ? v : (v as number | bigint).toString()

export type WithdrawStakeAllParams = {
  api: any
  operatorId: StringNumberOrBigInt
  account: string
}

export type WithdrawStakeByPercentParams = WithdrawStakeAllParams & {
  percent: StringNumberOrBigInt // 0..100
}

export type WithdrawStakeByValueParams = WithdrawStakeAllParams & {
  amountToWithdraw: StringNumberOrBigInt // balance units
}

/**
 * Compute shares for full withdrawal and delegate to withdrawStake()
 */
export const withdrawStakeAll = async ({ api, operatorId, account }: WithdrawStakeAllParams) => {
  const position = await nominatorPosition(api, operatorId as any, account)
  const { totalShares } = position

  if (totalShares === 0n) {
    throw new Error('No shares to withdraw for the provided account')
  }

  return withdrawStake({ api, operatorId, shares: totalShares })
}

/**
 * Compute shares from percent (0..100) and delegate to withdrawStake()
 */
export const withdrawStakeByPercent = async ({
  api,
  operatorId,
  account,
  percent,
}: WithdrawStakeByPercentParams) => {
  const position = await nominatorPosition(api, operatorId as any, account)
  const { totalShares } = position

  if (totalShares === 0n) {
    throw new Error('No shares to withdraw for the provided account')
  }

  // Normalize percent to bigint and clamp to [0, 100]
  const p = (() => {
    const raw = BigInt(toStringVal(percent))
    if (raw < 0n) return 0n
    if (raw > 100n) return 100n
    return raw
  })()

  const shares = (totalShares * p) / 100n
  if (shares === 0n) {
    throw new Error('Calculated shares is zero; increase percent or check position')
  }

  return withdrawStake({ api, operatorId, shares })
}

/**
 * Compute shares from requested token amount and delegate to withdrawStake()
 */
export const withdrawStakeByValue = async ({
  api,
  operatorId,
  account,
  amountToWithdraw,
}: WithdrawStakeByValueParams) => {
  const position = await nominatorPosition(api, operatorId as any, account)
  const { totalShares, currentStakedValue } = position

  if (totalShares === 0n || currentStakedValue === 0n) {
    throw new Error('No stake available to withdraw for the provided account')
  }

  const requested = BigInt(toStringVal(amountToWithdraw))
  const bounded = requested > currentStakedValue ? currentStakedValue : requested

  const shares = (bounded * totalShares) / currentStakedValue
  if (shares === 0n) {
    throw new Error('Calculated shares is zero; requested amount too small')
  }

  return withdrawStake({ api, operatorId, shares })
}