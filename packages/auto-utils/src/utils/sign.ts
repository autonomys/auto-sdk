import { signatureVerify } from '@polkadot/util-crypto'
import type { Signer } from '../types/wallet'
import { u8aToHex } from './format'

export const signMessage = async (signer: Signer, address: string, data: string) => {
  if (!signer.signRaw) throw new Error('signRaw not available on the signer')

  return await signer.signRaw({
    address,
    type: 'bytes',
    data,
  })
}

export const signingKey = (publicKey: Uint8Array) => u8aToHex(publicKey)

export { signatureVerify }
