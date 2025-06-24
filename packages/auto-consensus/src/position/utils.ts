/**
 * Converts operator shares to stake amount using a given share price.
 * 
 * This utility function converts a number of operator shares to the equivalent
 * stake amount using the provided share price. The share price should be in
 * 18-decimal Perbill format as returned by the price functions.
 * 
 * Formula: shares * price / 10^18
 * 
 * @param shares - Number of shares to convert
 * @param price - Share price in 18-decimal Perbill format
 * @returns Equivalent stake amount in smallest token units
 * 
 * @example
 * ```typescript
 * import { shareToStake, instantSharePrice } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * 
 * // Get current share price
 * const sharePrice = await instantSharePrice(api, '1')
 * 
 * // Convert 1000 shares to stake amount
 * const shares = BigInt(1000)
 * const stakeAmount = shareToStake(shares, sharePrice)
 * console.log(`${shares} shares = ${stakeAmount} tokens`)
 * ```
 */
export const shareToStake = (shares: bigint, price: bigint): bigint => {
  return (shares * price) / BigInt(10 ** 18)
}

/**
 * Converts stake amount to operator shares using a given share price.
 * 
 * This utility function converts a stake amount to the equivalent number
 * of operator shares using the provided share price. The share price should
 * be in 18-decimal Perbill format as returned by the price functions.
 * 
 * Formula: stake * 10^18 / price
 * 
 * @param stake - Stake amount in smallest token units to convert
 * @param price - Share price in 18-decimal Perbill format
 * @returns Equivalent number of shares
 * @throws Error if price is zero (division by zero)
 * 
 * @example
 * ```typescript
 * import { stakeToShare, instantSharePrice } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * 
 * // Get current share price
 * const sharePrice = await instantSharePrice(api, '1')
 * 
 * // Convert 1 ATC to shares
 * const stakeAmount = BigInt('1000000000000000000') // 1 ATC
 * const shares = stakeToShare(stakeAmount, sharePrice)
 * console.log(`${stakeAmount} tokens = ${shares} shares`)
 * ```
 */
export const stakeToShare = (stake: bigint, price: bigint): bigint => {
  if (price === BigInt(0)) {
    throw new Error('Price cannot be zero for stake to share conversion')
  }
  return (stake * BigInt(10 ** 18)) / price
}
