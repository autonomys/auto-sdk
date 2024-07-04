// file: src/address.ts

import { decodeAddress, encodeAddress } from '@polkadot/keyring'

export const address = (address: string | Uint8Array): string => encodeAddress(address, 2254)

export const decode = (address: string): Uint8Array => decodeAddress(address)
