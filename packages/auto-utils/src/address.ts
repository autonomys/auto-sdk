// file: src/address.ts

import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { DEFAULT_SS58_FORMAT } from './constants/wallet'

export const address = (address: string | Uint8Array): string =>
  encodeAddress(address, DEFAULT_SS58_FORMAT)

export const decode = (address: string): Uint8Array => decodeAddress(address)
