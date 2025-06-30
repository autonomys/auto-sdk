/**
 * Formats a byte value to binary units (powers of 2) and returns as an object.
 * 
 * This function converts a byte value to the most appropriate binary unit
 * (Bytes, KiB, MiB, GiB, etc.) using powers of 1024. Returns both the
 * formatted value and the unit as separate properties.
 * 
 * @param value - The byte value to format
 * @param decimals - Number of decimal places to display (default: 2)
 * @returns Object with formatted value and unit
 * 
 * @example
 * ```typescript
 * import { formatSpaceToBinaryAsObject } from '@autonomys/auto-consensus'
 * 
 * const result = formatSpaceToBinaryAsObject(1073741824) // 1 GB
 * console.log(`${result.value} ${result.unit}`) // "1.00 GiB"
 * 
 * const smallResult = formatSpaceToBinaryAsObject(1024)
 * console.log(`${smallResult.value} ${smallResult.unit}`) // "1.00 KiB"
 * ```
 */
// Binary format (powers of 2)
export const formatSpaceToBinaryAsObject = (
  value: number,
  decimals = 2,
): { value: number; unit: string } => {
  if (value === 0) return { value: 0, unit: 'Bytes' }

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(value) / Math.log(k))

  return { value: parseFloat((value / Math.pow(k, i)).toFixed(dm)), unit: sizes[i] }
}

/**
 * Formats a byte value to decimal units (powers of 10) and returns as an object.
 * 
 * This function converts a byte value to the most appropriate decimal unit
 * (Bytes, KB, MB, GB, etc.) using powers of 1000. Returns both the
 * formatted value and the unit as separate properties.
 * 
 * @param value - The byte value to format
 * @param decimals - Number of decimal places to display (default: 2)
 * @returns Object with formatted value and unit
 * 
 * @example
 * ```typescript
 * import { formatSpaceToDecimalAsObject } from '@autonomys/auto-consensus'
 * 
 * const result = formatSpaceToDecimalAsObject(1000000000) // 1 GB
 * console.log(`${result.value} ${result.unit}`) // "1.00 GB"
 * 
 * const smallResult = formatSpaceToDecimalAsObject(1000)
 * console.log(`${smallResult.value} ${smallResult.unit}`) // "1.00 KB"
 * ```
 */
// Decimal format (powers of 10)
export const formatSpaceToDecimalAsObject = (
  value: number,
  decimals = 2,
): { value: number; unit: string } => {
  if (value === 0) return { value: 0, unit: 'Bytes' }

  const k = 1000
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(value) / Math.log(k))

  return { value: parseFloat((value / Math.pow(k, i)).toFixed(dm)), unit: sizes[i] }
}

/**
 * Formats a byte value to binary units (powers of 2) as a string.
 * 
 * This function converts a byte value to the most appropriate binary unit
 * (Bytes, KiB, MiB, GiB, etc.) using powers of 1024 and returns it as
 * a formatted string ready for display.
 * 
 * @param value - The byte value to format
 * @param decimals - Number of decimal places to display (default: 2)
 * @returns Formatted string with value and unit
 * 
 * @example
 * ```typescript
 * import { formatSpaceToBinary } from '@autonomys/auto-consensus'
 * 
 * console.log(formatSpaceToBinary(1073741824)) // "1.00 GiB"
 * console.log(formatSpaceToBinary(1024)) // "1.00 KiB"
 * console.log(formatSpaceToBinary(0)) // "0 Bytes"
 * console.log(formatSpaceToBinary(1536, 1)) // "1.5 KiB"
 * ```
 */
// Binary format (powers of 2)
export const formatSpaceToBinary = (value: number, decimals = 2): string => {
  if (value === 0) return '0 Bytes'

  const { value: formattedValue, unit } = formatSpaceToBinaryAsObject(value, decimals)
  return `${formattedValue} ${unit}`
}

/**
 * Formats a byte value to decimal units (powers of 10) as a string.
 * 
 * This function converts a byte value to the most appropriate decimal unit
 * (Bytes, KB, MB, GB, etc.) using powers of 1000 and returns it as
 * a formatted string ready for display.
 * 
 * @param value - The byte value to format
 * @param decimals - Number of decimal places to display (default: 2)
 * @returns Formatted string with value and unit
 * 
 * @example
 * ```typescript
 * import { formatSpaceToDecimal } from '@autonomys/auto-consensus'
 * 
 * console.log(formatSpaceToDecimal(1000000000)) // "1.00 GB"
 * console.log(formatSpaceToDecimal(1000)) // "1.00 KB"
 * console.log(formatSpaceToDecimal(0)) // "0 Bytes"
 * console.log(formatSpaceToDecimal(1500, 1)) // "1.5 KB"
 * ```
 */
// Decimal format (powers of 10)
export const formatSpaceToDecimal = (value: number, decimals = 2): string => {
  if (value === 0) return '0 Bytes'

  const { value: formattedValue, unit } = formatSpaceToDecimalAsObject(value, decimals)
  return `${formattedValue} ${unit}`
}
