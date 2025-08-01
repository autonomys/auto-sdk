import { cryptoWaitReady } from '@polkadot/util-crypto'

/**
 * Cryptographic initialization utility re-exported from Polkadot.js for convenience.
 * 
 * Ensures that all cryptographic operations are ready before use. Essential to call
 * before performing any cryptographic operations in WebAssembly environments.
 * 
 * @see {@link https://polkadot.js.org/docs/ | Polkadot.js Documentation} for complete API details.
 */
export { cryptoWaitReady }
