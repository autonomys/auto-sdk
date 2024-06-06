import { encodeAddress } from '@polkadot/keyring'

export const address = (address: string | Uint8Array): string => encodeAddress(address, 2254)
