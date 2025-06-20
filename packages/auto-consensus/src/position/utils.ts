/**
 * Convert shares to stake using an 18-decimal Perbill price
 * Formula: shares * price / 10^18
 */
export const shareToStake = (shares: bigint, price: bigint): bigint => {
  return (shares * price) / BigInt(10 ** 18)
}

/**
 * Convert stake to shares using an 18-decimal Perbill price
 * Formula: stake * 10^18 / price
 */
export const stakeToShare = (stake: bigint, price: bigint): bigint => {
  if (price === BigInt(0)) {
    throw new Error('Price cannot be zero for stake to share conversion')
  }
  return (stake * BigInt(10 ** 18)) / price
}
