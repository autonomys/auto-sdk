// file: src/crypto.ts

import { blake2AsHex } from '@polkadot/util-crypto'

/**
 * Hashes the given data using BLAKE2b-256.
 *
 * @param data Uint8Array - The data to be hashed.
 * @returns string - The BLAKE2b-256 hash of the data as a hex string.
 */
export function blake2b_256(data: Uint8Array): string {
  return blake2AsHex(data, 256)
}

/**
 * Converts a string to a Uint8Array using UTF-8 encoding.
 *
 * This function uses the TextEncoder API to convert a plain string into its equivalent byte array
 * representation in UTF-8 format. It is useful for scenarios where string data needs to be processed
 * in a binary format, such as hashing or cryptographic operations.
 *
 * @param text The string to be converted into a byte array.
 * @returns Uint8Array - The UTF-8 encoded byte array representation of the input string.
 *
 * @example
 * const text = "Hello, world!";
 * const byteArray = stringToUint8Array(text);
 * console.log(byteArray); // Outputs the byte array of the string
 */
export function stringToUint8Array(text: string): Uint8Array {
  const encoder = new TextEncoder() // Create a new TextEncoder instance
  return encoder.encode(text) // Encode the string to a Uint8Array using UTF-8 encoding
}

/**
 * Concatenates two Uint8Array instances into a single Uint8Array.
 * 
 * This function efficiently combines two byte arrays into a single array, preserving
 * the order of the input arrays. It's commonly used for combining data before hashing,
 * creating composite data structures, or preparing data for cryptographic operations.
 * 
 * @param array1 - The first Uint8Array to concatenate.
 * @param array2 - The second Uint8Array to concatenate.
 * @returns A new Uint8Array containing all bytes from array1 followed by all bytes from array2.
 * 
 * @example
 * import { stringToUint8Array, concatenateUint8Arrays } from '@autonomys/auto-utils'
 * 
 * // Concatenate two strings as byte arrays
 * const part1 = stringToUint8Array('Hello, ')
 * const part2 = stringToUint8Array('Autonomys!')
 * const combined = concatenateUint8Arrays(part1, part2)
 * 
 * // Convert back to string to verify
 * const result = new TextDecoder().decode(combined)
 * console.log(result) // Output: "Hello, Autonomys!"
 * console.log(combined.length) // Output: 16 (total length of both arrays)
 * 
 * // Concatenate with hash data
 * const data1 = stringToUint8Array('message1')
 * const data2 = stringToUint8Array('message2')
 * const combinedData = concatenateUint8Arrays(data1, data2)
 * const hash = blake2b_256(combinedData)
 * console.log(hash) // Output: hash of combined data
 */
export function concatenateUint8Arrays(array1: Uint8Array, array2: Uint8Array): Uint8Array {
  const combined = new Uint8Array(array1.length + array2.length)
  combined.set(array1)
  combined.set(array2, array1.length)
  return combined
}
