// file: src/string.ts

/**
 * Converts any value to a JSON string with BigInt support.
 * 
 * This function extends JSON.stringify to handle BigInt values by converting them to strings.
 * It's particularly useful when working with blockchain data that often includes large numbers
 * represented as BigInt values.
 * 
 * @param value - Any value to be stringified, including objects with BigInt properties.
 * @returns A JSON string representation of the value with BigInt values converted to strings.
 * 
 * @example
 * import { stringify } from '@autonomys/auto-utils'
 * 
 * // Stringify object with BigInt values
 * const data = {
 *   balance: BigInt('1000000000000000000'),
 *   timestamp: Date.now(),
 *   address: '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'
 * }
 * 
 * const jsonString = stringify(data)
 * console.log(jsonString)
 * // Output: {"balance":"1000000000000000000","timestamp":1672531200000,"address":"5G..."}
 * 
 * // Compare with regular JSON.stringify which would throw an error
 * // JSON.stringify(data) // TypeError: Do not know how to serialize a BigInt
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stringify = (value: any) =>
  JSON.stringify(value, (_, value) => (typeof value === 'bigint' ? value.toString() : value))

/**
 * Truncates a string by keeping the beginning and end characters with ellipsis in the middle.
 * 
 * This function is commonly used to display long addresses, transaction hashes, or other
 * identifiers in a compact format while preserving recognizable parts of the original string.
 * 
 * @param value - The string to truncate.
 * @param initialLength - Number of characters to keep from the beginning. Defaults to 6.
 * @param endLength - Number of characters to keep from the end (negative number). Defaults to -4.
 * @returns The truncated string with ellipsis in the middle.
 * 
 * @example
 * import { shortString } from '@autonomys/auto-utils'
 * 
 * // Truncate a long address
 * const address = '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'
 * const short = shortString(address)
 * console.log(short) // Output: "5GmS1w...W6A8"
 * 
 * // Custom truncation lengths
 * const customShort = shortString(address, 8, -6)
 * console.log(customShort) // Output: "5GmS1wtC...oLW6A8"
 * 
 * // Truncate transaction hash
 * const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
 * const shortHash = shortString(txHash, 10, -8)
 * console.log(shortHash) // Output: "0x12345678...90abcdef"
 */
export const shortString = (value: string, initialLength = 6, endLength = -4): string =>
  `${value.slice(0, initialLength)}...${value.slice(endLength)}`

/**
 * Capitalizes the first letter of a string.
 * 
 * This utility function converts the first character of a string to uppercase while
 * leaving the rest of the string unchanged. It handles empty strings gracefully.
 * 
 * @param string - The string to capitalize.
 * @returns The string with the first letter capitalized, or empty string if input is empty.
 * 
 * @example
 * import { capitalizeFirstLetter } from '@autonomys/auto-utils'
 * 
 * // Capitalize network names
 * console.log(capitalizeFirstLetter('mainnet')) // Output: "Mainnet"
 * console.log(capitalizeFirstLetter('gemini-3h')) // Output: "Gemini-3h"
 * 
 * // Handle edge cases
 * console.log(capitalizeFirstLetter('')) // Output: ""
 * console.log(capitalizeFirstLetter('a')) // Output: "A"
 * console.log(capitalizeFirstLetter('UPPERCASE')) // Output: "UPPERCASE"
 */
export const capitalizeFirstLetter = (string: string) =>
  string ? string.charAt(0).toUpperCase() + string.slice(1) : ''

/**
 * Creates a fixed-length entry identifier for blockchain events or transactions.
 * 
 * This function generates a standardized identifier format used for indexing blockchain
 * entries, combining block height with optional transaction index. Both values are
 * zero-padded to ensure consistent string length for sorting and indexing.
 * 
 * @param blockHeight - The block height as a BigInt.
 * @param indexInBlock - Optional transaction index within the block as a BigInt.
 * @returns A zero-padded string identifier, either "blockHeight" or "blockHeight-indexInBlock".
 * 
 * @example
 * import { fixLengthEntryId } from '@autonomys/auto-utils'
 * 
 * // Create block identifier
 * const blockId = fixLengthEntryId(BigInt(12345))
 * console.log(blockId) // Output: "00000000000000000000000000012345"
 * 
 * // Create transaction identifier
 * const txId = fixLengthEntryId(BigInt(12345), BigInt(7))
 * console.log(txId) // Output: "00000000000000000000000000012345-00000000000000000000000000000007"
 * 
 * // Use with large numbers
 * const largeBlockId = fixLengthEntryId(BigInt('1000000000000000000'))
 * console.log(largeBlockId) // Output: "00000000000001000000000000000000"
 * 
 * // Useful for creating sortable identifiers
 * const ids = [
 *   fixLengthEntryId(BigInt(100)),
 *   fixLengthEntryId(BigInt(50)),
 *   fixLengthEntryId(BigInt(200))
 * ]
 * ids.sort() // Will sort correctly due to zero-padding
 */
export const fixLengthEntryId = (blockHeight: bigint, indexInBlock?: bigint): string => {
  const totalLength = 32
  const str1 = blockHeight.toString().padStart(totalLength, '0')

  if (indexInBlock === undefined) return str1

  const str2 = indexInBlock.toString().padStart(totalLength, '0')
  return `${str1}-${str2}`
}
