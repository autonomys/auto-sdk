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
 */
export function concatenateUint8Arrays(array1: Uint8Array, array2: Uint8Array): Uint8Array {
  const combined = new Uint8Array(array1.length + array2.length)
  combined.set(array1)
  combined.set(array2, array1.length)
  return combined
}
