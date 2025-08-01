// file: src/address.ts

import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { DEFAULT_SS58_FORMAT } from './constants/wallet'

/**
 * Converts an address to the standard Autonomys Network format with SS58 encoding.
 * 
 * This function standardizes addresses across the Autonomys Network by encoding them
 * using the SS58 format. It accepts both string addresses and Uint8Array representations,
 * making it flexible for various use cases.
 * 
 * @param address - The address to convert. Can be a string address or Uint8Array public key.
 * @param ss58Format - The SS58 format number to use for encoding. Defaults to the mainnet format.
 * @returns The standardized address string in SS58 format.
 * 
 * @example
 * import { address } from '@autonomys/auto-utils'
 * 
 * // Convert a raw address to mainnet format
 * const mainnetAddress = address('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
 * console.log(mainnetAddress) // Output: standardized mainnet address
 * 
 * // Convert using custom SS58 format
 * const customAddress = address('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 42)
 * console.log(customAddress) // Output: address in format 42
 * 
 * // Convert from Uint8Array public key
 * const publicKey = new Uint8Array(32) // 32-byte public key
 * const addressFromPubKey = address(publicKey)
 * console.log(addressFromPubKey) // Output: standardized address
 * 
 * @throws {Error} When the input address is invalid or cannot be encoded.
 */
export const address = (
  address: string | Uint8Array,
  ss58Format: number = DEFAULT_SS58_FORMAT,
): string => encodeAddress(address, ss58Format)

/**
 * Decodes an SS58 address to its raw Uint8Array representation.
 * 
 * This function extracts the underlying public key bytes from an SS58-encoded address.
 * It's useful when you need to work with the raw address data for cryptographic operations
 * or when interfacing with lower-level blockchain functions.
 * 
 * @param address - The SS58-encoded address string to decode.
 * @returns The decoded address as a Uint8Array (32 bytes for most address types).
 * 
 * @example
 * import { decode } from '@autonomys/auto-utils'
 * 
 * // Decode a mainnet address
 * const addressString = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
 * const publicKeyBytes = decode(addressString)
 * console.log(publicKeyBytes) // Output: Uint8Array(32) [...]
 * console.log(publicKeyBytes.length) // Output: 32
 * 
 * // Use decoded bytes for cryptographic operations
 * const decoded = decode('5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8')
 * // decoded can now be used with other crypto functions
 * 
 * @throws {Error} When the address is invalid, malformed, or has an incorrect checksum.
 */
export const decode = (address: string): Uint8Array => decodeAddress(address)
