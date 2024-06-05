import { encodeAddress } from '@polkadot/keyring'

export const address = (address: string | Uint8Array): string => {
  return encodeAddress(address, 2254)
}
