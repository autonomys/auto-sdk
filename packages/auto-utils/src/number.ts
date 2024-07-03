import { DEFAULT_TOKEN_DECIMALS } from './constants/token'

export const parseTokenAmount = (
  amount: string | bigint,
  decimals: number = DEFAULT_TOKEN_DECIMALS,
) => {
  if (typeof amount === 'bigint') return amount / BigInt(Math.pow(10, decimals))
  return parseFloat(amount) / Math.pow(10, decimals)
}

export const formatTokenAmount = (
  amount: number | bigint,
  decimals: number = DEFAULT_TOKEN_DECIMALS,
) => {
  if (typeof amount === 'bigint') return amount * BigInt(Math.pow(10, decimals))
  return amount * Math.pow(10, decimals)
}
