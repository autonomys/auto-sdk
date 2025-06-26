import { BIGINT_ZERO } from './constants/number'
import { DEFAULT_TOKEN_DECIMALS } from './constants/token'

/**
 * Parses a token amount from its smallest unit representation to a human-readable format.
 * 
 * This function converts token amounts stored in their smallest unit (with decimal places)
 * back to their standard decimal representation. It handles both string and BigInt inputs
 * and is essential for displaying token balances in user interfaces.
 * 
 * @param amount - The token amount in smallest units (string or BigInt).
 * @param decimals - Number of decimal places the token uses. Defaults to 18 for AI3 tokens.
 * @returns The parsed amount as a number with decimal places applied.
 * 
 * @example
 * import { parseTokenAmount } from '@autonomys/auto-utils'
 * 
 * // Parse AI3 token amount (18 decimals)
 * const balance = '1000000000000000000' // 1 AI3 in smallest units
 * const readable = parseTokenAmount(balance)
 * console.log(readable) // Output: 1
 * 
 * // Parse with custom decimals
 * const customBalance = BigInt('1000000') // 1 token with 6 decimals
 * const customReadable = parseTokenAmount(customBalance, 6)
 * console.log(customReadable) // Output: 1
 * 
 * // Parse fractional amounts
 * const fractional = '500000000000000000' // 0.5 AI3
 * const fractionalReadable = parseTokenAmount(fractional)
 * console.log(fractionalReadable) // Output: 0.5
 */
export const parseTokenAmount = (
  amount: string | bigint,
  decimals: number = DEFAULT_TOKEN_DECIMALS,
) => {
  if (typeof amount === 'bigint') return amount / BigInt(Math.pow(10, decimals))
  return parseFloat(amount) / Math.pow(10, decimals)
}

/**
 * Formats a human-readable token amount to its smallest unit representation.
 * 
 * This function converts user-friendly decimal token amounts into the format required
 * for blockchain transactions. It multiplies the amount by the appropriate power of 10
 * based on the token's decimal places.
 * 
 * @param amount - The token amount in human-readable format (number or BigInt).
 * @param decimals - Number of decimal places the token uses. Defaults to 18 for AI3 tokens.
 * @returns The formatted amount in smallest units (BigInt for BigInt input, number for number input).
 * 
 * @example
 * import { formatTokenAmount } from '@autonomys/auto-utils'
 * 
 * // Format AI3 token amount (18 decimals)
 * const userAmount = 1.5 // 1.5 AI3
 * const formatted = formatTokenAmount(userAmount)
 * console.log(formatted) // Output: 1500000000000000000
 * 
 * // Format with BigInt input
 * const bigAmount = BigInt(10)
 * const bigFormatted = formatTokenAmount(bigAmount)
 * console.log(bigFormatted) // Output: 10000000000000000000n
 * 
 * // Format with custom decimals
 * const customAmount = 100
 * const customFormatted = formatTokenAmount(customAmount, 6)
 * console.log(customFormatted) // Output: 100000000
 */
export const formatTokenAmount = (
  amount: number | bigint,
  decimals: number = DEFAULT_TOKEN_DECIMALS,
) => {
  if (typeof amount === 'bigint') return amount * BigInt(Math.pow(10, decimals))
  return amount * Math.pow(10, decimals)
}

/**
 * Formats a space pledged value into a human-readable format with appropriate units.
 * 
 * This function converts raw byte values into readable formats using binary units
 * (KiB, MiB, GiB, etc.). It's specifically designed for displaying storage space
 * amounts in the Autonomys Network, such as pledged storage space by farmers.
 * 
 * @param value - The space value in bytes as a BigInt.
 * @param decimals - Number of decimal places to display. Defaults to 2.
 * @returns A formatted string with the appropriate unit (e.g., "1.50 TiB").
 * 
 * @example
 * import { formatSpacePledged } from '@autonomys/auto-utils'
 * 
 * // Format small amounts
 * const smallSpace = BigInt(1024)
 * console.log(formatSpacePledged(smallSpace)) // Output: "1.00 KiB"
 * 
 * // Format large amounts
 * const largeSpace = BigInt('1099511627776') // 1 TiB in bytes
 * console.log(formatSpacePledged(largeSpace)) // Output: "1.00 TiB"
 * 
 * // Format with custom decimal places
 * const customSpace = BigInt('1610612736') // 1.5 GiB
 * console.log(formatSpacePledged(customSpace, 3)) // Output: "1.500 GiB"
 * 
 * // Handle zero values
 * console.log(formatSpacePledged(BigInt(0))) // Output: "0 Bytes"
 * 
 * // Handle very large values
 * const hugeSpace = BigInt('1152921504606846976') // 1 EiB
 * console.log(formatSpacePledged(hugeSpace)) // Output: "1.00 EiB"
 */
export const formatSpacePledged = (value: bigint, decimals = 2) => {
  if (typeof value !== 'bigint' || value === BIGINT_ZERO) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(Number(value)) / Math.log(k))

  return (Number(value) / Math.pow(k, i)).toFixed(dm) + ' ' + sizes[i]
}
