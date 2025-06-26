import { stringToU8a, u8aToHex } from '@polkadot/util'

/**
 * Re-exported utility functions for data format conversion from Polkadot.js utilities.
 * 
 * These functions provide essential conversion capabilities between different data formats
 * commonly used in blockchain applications, particularly for encoding and decoding operations.
 * 
 * @example
 * import { stringToU8a, u8aToHex } from '@autonomys/auto-utils'
 * 
 * // Convert string to Uint8Array
 * const textData = 'Hello, Autonomys!'
 * const bytes = stringToU8a(textData)
 * console.log('String as bytes:', bytes)
 * 
 * // Convert Uint8Array to hex string
 * const hexString = u8aToHex(bytes)
 * console.log('Bytes as hex:', hexString) // Output: "0x48656c6c6f2c204175746f6e6f6d797321"
 * 
 * // Chain conversions
 * const roundTrip = stringToU8a('test data')
 * const hexResult = u8aToHex(roundTrip)
 * console.log('Hex encoded:', hexResult)
 */
export { stringToU8a, u8aToHex }
