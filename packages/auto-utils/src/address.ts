// file: src/address.ts

import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { DEFAULT_SS58_FORMAT } from './constants/wallet'

export const address = (
  address: string | Uint8Array,
  ss58Format: number = DEFAULT_SS58_FORMAT,
): string => encodeAddress(address, ss58Format)

export const decode = (address: string): Uint8Array => decodeAddress(address)
