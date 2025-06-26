import { isHex } from '@polkadot/util'
import { isAddress } from '@polkadot/util-crypto'

/**
 * Re-exported validation functions from Polkadot.js utilities.
 * 
 * These functions provide essential validation capabilities for common blockchain
 * data types, helping to verify the correctness of addresses and hex strings.
 * 
 * @example
 * import { isAddress, isHex } from '@autonomys/auto-utils'
 * 
 * // Validate Autonomys addresses
 * const validAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
 * console.log('Is valid address:', isAddress(validAddress)) // true
 * 
 * const invalidAddress = 'not-an-address'
 * console.log('Is valid address:', isAddress(invalidAddress)) // false
 * 
 * // Validate hex strings
 * const validHex = '0x1234abcd'
 * console.log('Is valid hex:', isHex(validHex)) // true
 * 
 * const invalidHex = 'not-hex'
 * console.log('Is valid hex:', isHex(invalidHex)) // false
 * 
 * // Use in input validation
 * function transferTokens(toAddress: string, amount: string) {
 *   if (!isAddress(toAddress)) {
 *     throw new Error('Invalid recipient address')
 *   }
 *   if (!isHex(amount)) {
 *     throw new Error('Amount must be a valid hex string')
 *   }
 *   // Proceed with transfer...
 * }
 */
export { isAddress, isHex }
