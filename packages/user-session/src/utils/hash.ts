import {
  blake3HashFromCid,
  cidFromBlakeHash,
  cidToString,
  stringToCid,
} from '@autonomys/auto-dag-data'
import { hexlify, keccak256, toUtf8Bytes, zeroPadValue } from 'ethers'

export const userIdHash = (userId: string) => keccak256(toUtf8Bytes(userId))

export const userSessionCIDHash = (CID: string) =>
  zeroPadValue(hexlify(blake3HashFromCid(stringToCid(CID))), 32)

export const userSessionCIDFromHash = (hash: Buffer) => cidToString(cidFromBlakeHash(hash))
