import { signatureVerify } from '@polkadot/util-crypto'
import type { Signer } from '../types/wallet'
import { u8aToHex } from './format'

/**
 * Signs arbitrary data using a Polkadot.js extension signer.
 * 
 * This function uses the raw signing capability of a Polkadot.js extension to sign
 * arbitrary byte data. It's commonly used for authentication, message signing,
 * or creating signatures for off-chain verification.
 * 
 * @param signer - The Polkadot.js extension signer interface.
 * @param address - The address of the account to sign with.
 * @param data - The data to sign as a string (will be encoded as bytes).
 * @returns Promise resolving to the signature result containing the signature and other metadata.
 * 
 * @example
 * import { signMessage } from '@autonomys/auto-utils'
 * import { web3FromAddress } from '@polkadot/extension-dapp'
 * 
 * // Sign a message with extension wallet
 * const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
 * const injector = await web3FromAddress(address)
 * 
 * const message = 'Hello, Autonomys Network!'
 * const signature = await signMessage(injector.signer, address, message)
 * 
 * console.log('Signature:', signature.signature)
 * console.log('Signed by:', signature.id)
 * 
 * // Sign authentication challenge
 * const challenge = `Login to dApp at ${Date.now()}`
 * const authSignature = await signMessage(injector.signer, address, challenge)
 * 
 * // Use signature for verification later
 * const isValid = signatureVerify(challenge, authSignature.signature, address)
 * console.log('Signature valid:', isValid.isValid)
 * 
 * @throws {Error} When the signer doesn't support raw signing or signing fails.
 */
export const signMessage = async (signer: Signer, address: string, data: string) => {
  if (!signer.signRaw) throw new Error('signRaw not available on the signer')

  return await signer.signRaw({
    address,
    type: 'bytes',
    data,
  })
}

/**
 * Converts a public key to a hexadecimal string representation.
 * 
 * This utility function converts a Uint8Array public key into its hexadecimal
 * string representation, which is useful for display, logging, or storage purposes.
 * 
 * @param publicKey - The public key as a Uint8Array.
 * @returns The public key as a hexadecimal string with '0x' prefix.
 * 
 * @example
 * import { signingKey } from '@autonomys/auto-utils'
 * 
 * // Convert KeyringPair public key to hex
 * const wallet = setupWallet({ uri: '//Alice' })
 * const publicKeyHex = signingKey(wallet.keyringPair.publicKey)
 * console.log('Public key:', publicKeyHex) // Output: "0x..."
 * 
 * // Use with signature verification
 * const publicKeyBytes = new Uint8Array(32) // 32-byte public key
 * const hexKey = signingKey(publicKeyBytes)
 * console.log('Hex public key:', hexKey)
 */
export const signingKey = (publicKey: Uint8Array) => u8aToHex(publicKey)

/**
 * Signature verification utility re-exported from Polkadot.js for convenience.
 * 
 * Verifies that a signature was created by a specific public key for the given data.
 * Essential for validating signatures in authentication flows and off-chain verification.
 * 
 * @see {@link https://polkadot.js.org/docs/ | Polkadot.js Documentation} for complete API details.
 */
export { signatureVerify }
