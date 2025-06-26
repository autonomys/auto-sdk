import { cryptoWaitReady } from '@polkadot/util-crypto'

/**
 * Re-exported cryptographic initialization function from Polkadot.js utilities.
 * 
 * This function ensures that all cryptographic operations are ready before use.
 * It's essential to call this before performing any cryptographic operations
 * in environments where WebAssembly modules need to be loaded.
 * 
 * @example
 * import { cryptoWaitReady } from '@autonomys/auto-utils'
 * 
 * // Initialize crypto before using cryptographic functions
 * async function initializeApp() {
 *   await cryptoWaitReady()
 *   console.log('Cryptographic functions are ready')
 *   
 *   // Now safe to use crypto functions like:
 *   // - Key generation
 *   // - Signing operations
 *   // - Address derivation
 *   // - Hashing functions
 * }
 * 
 * // Use in application startup
 * async function startApp() {
 *   try {
 *     await cryptoWaitReady()
 *     // Initialize wallets, API connections, etc.
 *   } catch (error) {
 *     console.error('Failed to initialize crypto:', error)
 *   }
 * }
 */
export { cryptoWaitReady }
