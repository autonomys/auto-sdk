import { BIGINT_ZERO } from './constants/number'
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

export const formatSpacePledged = (value: bigint, decimals = 2) => {
  if (typeof value !== 'bigint' || value === BIGINT_ZERO) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(Number(value)) / Math.log(k))

  return (Number(value) / Math.pow(k, i)).toFixed(dm) + ' ' + sizes[i]
}
