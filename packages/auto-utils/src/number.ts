import { BIGINT_ZERO } from './constants/number'
import { DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS, DEFAULT_TOKEN_DECIMALS } from './constants/token'

/**
 * Parses a token amount from its smallest unit representation to a human-readable format.
 *
 * This function converts token amounts stored in their smallest unit (with decimal places)
 * back to their standard decimal representation. It handles both string and BigInt inputs
 * and is useful for displaying token balances in user interfaces.
 *
 * This function uses floating-point arithmetic and may lose precision
 * for large values or high-precision decimals. For precise calculations, consider using
 * `formatUnits` or `shannonsToAi3` instead.
 *
 * @param amount - The token amount in smallest units (string or BigInt).
 * @param decimals - Number of decimal places the token uses. Defaults to 18 for AI3 tokens.
 * @returns The parsed amount as a number (for string input) or bigint (for BigInt input).
 *
 * @example
 * import { parseTokenAmount } from '@autonomys/auto-utils'
 *
 * // Parse AI3 token amount (18 decimals) - string input returns number
 * const balance = '1000000000000000000' // 1 AI3 in smallest units
 * const readable = parseTokenAmount(balance)
 * console.log(readable) // Output: 1 (number)
 *
 * // Parse with BigInt input - returns bigint
 * const customBalance = BigInt('1000000') // 1 token with 6 decimals
 * const customReadable = parseTokenAmount(customBalance, 6)
 * console.log(customReadable) // Output: 1n (bigint)
 *
 * // Parse fractional amounts
 * const fractional = '500000000000000000' // 0.5 AI3
 * const fractionalReadable = parseTokenAmount(fractional)
 * console.log(fractionalReadable) // Output: 0.5 (number)
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
 *
 * This function uses floating-point arithmetic for number inputs
 * and may lose precision for large values or high-precision decimals. For precise calculations,
 * consider using `parseUnits` or `ai3ToShannons` instead.
 *
 * @param amount - The token amount in human-readable format (number or BigInt).
 * @param decimals - Number of decimal places the token uses. Defaults to 18 for AI3 tokens.
 * @returns The formatted amount in smallest units (number for number input, BigInt for BigInt input).
 *
 * @example
 * import { formatTokenAmount } from '@autonomys/auto-utils'
 *
 * // Format AI3 token amount (18 decimals) - number input returns number
 * const userAmount = 1.5 // 1.5 AI3
 * const formatted = formatTokenAmount(userAmount)
 * console.log(formatted) // Output: 1500000000000000000 (number)
 *
 * // Format with BigInt input - returns BigInt
 * const bigAmount = BigInt(10)
 * const bigFormatted = formatTokenAmount(bigAmount)
 * console.log(bigFormatted) // Output: 10000000000000000000n (BigInt)
 *
 * // Format with custom decimals
 * const customAmount = 100
 * const customFormatted = formatTokenAmount(customAmount, 6)
 * console.log(customFormatted) // Output: 100000000 (number)
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

/**
 * Parse a human-readable decimal string into smallest units as a bigint.
 *
 * - Accepts optional leading sign and a single decimal point
 * - Disallows scientific notation
 * - If fractional digits exceed `decimals`, defaults to throwing; caller can opt into truncation or rounding
 * - If `options.rounding` is `'round'`, rounds half up based on the first discarded digit (i.e., if the first omitted digit is 5 or greater, rounds up)
 * - If `options.rounding` is `'ceil'`, always rounds up if there are any excess fractional digits (ceiling function)
 * - This is not banker's rounding (half to even) or round away from zero
 */
export const parseUnits = (
  value: string,
  decimals: number = DEFAULT_TOKEN_DECIMALS,
  options: { rounding?: 'error' | 'truncate' | 'round' | 'ceil' } = {},
): bigint => {
  const { rounding = 'error' } = options
  if (typeof value !== 'string') throw new Error('parseUnits: value must be a string')
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error('parseUnits: decimals must be a non-negative integer')
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new Error('parseUnits: empty string')

  const signIsNegative = trimmed.startsWith('-')
  const unsigned = trimmed.replace(/^[+-]/, '')
  if (!/^\d+(?:\.\d+)?$/.test(unsigned))
    throw new Error(`parseUnits: invalid numeric string "${value}"`)

  const [wholePartRaw, fractionalRaw = ''] = unsigned.split('.')
  const wholePart = wholePartRaw || '0'

  const fractional = fractionalRaw.slice(0, decimals)
  const extra = fractionalRaw.slice(decimals)

  const base = BigInt(10) ** BigInt(decimals)
  const whole = BigInt(wholePart) * base

  let frac = BigInt((fractional || '0').padEnd(decimals, '0'))

  if (extra.length > 0) {
    switch (rounding) {
      case 'error':
        throw new Error(`parseUnits: too many decimal places for ${decimals} decimals`)
      case 'round': {
        const roundUp = extra[0] >= '5'
        if (roundUp) {
          frac = frac + BigInt(1)
          // handle carry into whole if frac rolls over
          if (frac === base) {
            frac = BigInt(0)
            return (signIsNegative ? BigInt(-1) : BigInt(1)) * (whole + base)
          }
        }
        break
      }
      case 'ceil':
        // Always round up if there are any excess digits (ceiling function)
        frac = frac + BigInt(1)
        // handle carry into whole if frac rolls over
        if (frac === base) {
          frac = BigInt(0)
          return (signIsNegative ? BigInt(-1) : BigInt(1)) * (whole + base)
        }
        break
      case 'truncate':
      default:
        // truncate (no-op; we already sliced)
        break
    }
  }

  const result = whole + frac
  return signIsNegative ? -result : result
}

/**
 * Format smallest units bigint into a human-readable decimal string.
 *
 * - No floating point used
 * - Trims trailing zeros by default and removes decimal point if fractional becomes zero
 */
export const formatUnits = (
  value: bigint | string,
  decimals: number = DEFAULT_TOKEN_DECIMALS,
  options: { trimTrailingZeros?: boolean } = {},
): string => {
  const { trimTrailingZeros = true } = options
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error('formatUnits: decimals must be a non-negative integer')
  }
  const v = typeof value === 'bigint' ? value : BigInt(value)
  const negative = v < BigInt(0)
  const abs = negative ? -v : v
  const base = BigInt(10) ** BigInt(decimals)
  const whole = abs / base
  const fractional = abs % base

  if (fractional === BigInt(0)) return `${negative ? '-' : ''}${whole.toString()}`

  let fracStr = fractional.toString().padStart(decimals, '0')
  if (trimTrailingZeros) fracStr = fracStr.replace(/0+$/, '')
  const sign = negative ? '-' : ''
  return fracStr.length ? `${sign}${whole.toString()}.${fracStr}` : `${sign}${whole.toString()}`
}

/**
 * Convert AI3 token amount to Shannon units (smallest units).
 *
 * Converts a human-readable AI3 amount (like "1.5") to its exact representation
 * in Shannon units as a BigInt. This ensures perfect precision for financial calculations.
 *
 * @param ai3Amount - AI3 amount as a decimal string (e.g., "1.5", "0.000000000000000001")
 * @param options - Rounding behavior for excess decimal places
 * @returns Shannon amount as BigInt (e.g., 1500000000000000000n for "1.5" AI3)
 *
 * @example
 * import { ai3ToShannons } from '@autonomys/auto-utils'
 *
 * // Convert 1.5 AI3 to Shannon
 * const shannons = ai3ToShannons("1.5")
 * console.log(shannons) // 1500000000000000000n
 *
 * // Convert tiny amount
 * const tinyShannons = ai3ToShannons("0.000000000000000001")
 * console.log(tinyShannons) // 1n
 *
 * // Always round up with excess decimals
 * const ceilShannons = ai3ToShannons("1.0000000000000000001", { rounding: 'ceil' })
 * console.log(shannonsToAi3(ceilShannons)) // "1.000000000000000001"
 */
export const ai3ToShannons = (
  ai3Amount: string,
  options: { rounding?: 'error' | 'truncate' | 'round' | 'ceil' } = {},
): bigint => parseUnits(ai3Amount, DEFAULT_TOKEN_DECIMALS, options)

/**
 * Convert Shannon units to AI3 token amount.
 *
 * Converts Shannon units (smallest units) back to a human-readable AI3 amount.
 * Uses exact BigInt arithmetic to avoid any precision loss.
 *
 * @param shannons - Shannon amount as BigInt or string
 * @param options - Formatting options (trailing zero trimming)
 * @returns AI3 amount as decimal string (e.g., "1.5" for 1500000000000000000n Shannon)
 *
 * @example
 * import { shannonsToAi3 } from '@autonomys/auto-utils'
 *
 * // Convert Shannon back to AI3
 * const ai3Amount = shannonsToAi3(1500000000000000000n)
 * console.log(ai3Amount) // "1.5"
 *
 * // Convert single Shannon
 * const tinyAi3 = shannonsToAi3(1n)
 * console.log(tinyAi3) // "0.000000000000000001"
 */
export const shannonsToAi3 = (
  shannons: bigint | string,
  options: { trimTrailingZeros?: boolean } = {},
): string => formatUnits(shannons, DEFAULT_TOKEN_DECIMALS, options)

/**
 * Checks if an AI3 amount meets the Autonomys Network existential deposit requirement.
 *
 * The existential deposit (ED) is the minimum balance required to keep an account active
 * on the Autonomys Network. Accounts with balances below the ED may be reaped (removed)
 * by the network, and their funds will be destroyed to prevent storage bloat.
 *
 * This function accepts AI3 amounts as strings and performs string-to-BigInt conversion.
 * For direct Shannon (BigInt) validation, use `meetsExistentialDepositShannons` instead.
 *
 * For Autonomys Network, the existential deposit is 0.00001 AI3 (10,000,000,000,000 Shannons).
 *
 * @param amount - AI3 amount as a decimal string (e.g., "1.5", "0.000001")
 * @returns true if the amount meets or exceeds the existential deposit requirement
 * @throws Error if the amount format is invalid (same validation as ai3ToShannons)
 * @see meetsExistentialDepositShannons - for direct Shannon (BigInt) validation
 *
 * @example
 * import { meetsExistentialDepositAi3 } from '@autonomys/auto-utils'
 *
 * // Check if amount meets ED requirement
 * const amount = "0.00001"
 * if (meetsExistentialDepositAi3(amount)) {
 *   console.log('Amount meets existential deposit requirement')
 * } else {
 *   console.log(`Amount too low. Minimum required: 0.00001 AI3`)
 * }
 *
 * // Examples of different amounts
 * console.log(meetsExistentialDepositAi3("0.000005")) // false - below ED
 * console.log(meetsExistentialDepositAi3("0.00001"))  // true - exactly at ED
 * console.log(meetsExistentialDepositAi3("0.00002"))  // true - above ED
 * console.log(meetsExistentialDepositAi3("1"))         // true - well above ED
 *
 * // Will throw error for invalid formats
 * try {
 *   meetsExistentialDepositAi3("invalid")
 * } catch (error) {
 *   console.error("Invalid amount format")
 * }
 */
export const meetsExistentialDepositAi3 = (amount: string): boolean => {
  return meetsExistentialDepositShannons(ai3ToShannons(amount))
}

/**
 * Checks if a Shannon amount meets the Autonomys Network existential deposit requirement.
 *
 * This is the Shannon-based version of `meetsExistentialDepositAi3` that works directly with
 * BigInt values in the smallest units (Shannons). It's more efficient when you already
 * have amounts in Shannon units and don't need string parsing.
 *
 * For Autonomys Network, the existential deposit is 10,000,000,000,000 Shannons (0.00001 AI3).
 *
 * @param amount - Shannon amount as BigInt (smallest units)
 * @returns true if the amount meets or exceeds the existential deposit requirement
 *
 * @example
 * import { meetsExistentialDepositShannons, DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS } from '@autonomys/auto-utils'
 *
 * // Check if Shannon amount meets ED requirement
 * const shannons = BigInt('10000000000000') // 0.00001 AI3
 * if (meetsExistentialDepositShannons(shannons)) {
 *   console.log('Amount meets existential deposit requirement')
 * }
 *
 * // Examples with different Shannon amounts
 * console.log(meetsExistentialDepositShannons(BigInt('9999999999999'))) // false - below ED
 * console.log(meetsExistentialDepositShannons(BigInt('10000000000000'))) // true - exactly at ED
 * console.log(meetsExistentialDepositShannons(BigInt('20000000000000'))) // true - above ED
 * console.log(meetsExistentialDepositShannons(BigInt('1000000000000000000'))) // true - 1 AI3
 *
 * // Works with the constant directly
 * console.log(meetsExistentialDepositShannons(DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS)) // true
 *
 * // Handles negative amounts
 * console.log(meetsExistentialDepositShannons(BigInt('-10000000000000'))) // false
 */
export const meetsExistentialDepositShannons = (amount: bigint): boolean => {
  return amount >= DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS
}
