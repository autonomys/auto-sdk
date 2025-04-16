import {
  blake3HashFromCid,
  cidFromBlakeHash,
  cidToString,
  stringToCid,
} from '@autonomys/auto-dag-data'
import { hexlify, keccak256, toUtf8Bytes, zeroPadValue } from 'ethers'

export const userIdHash = (userId: string) => keccak256(toUtf8Bytes(userId))

export const userSessionCIDHash = (CID: string) => {
  const blake3Hash = blake3HashFromCid(stringToCid(CID))
  return zeroPadValue(hexlify(blake3Hash), 32)
}

export const userSessionCIDFromHash = (hash: string) => {
  const hashBuffer = Buffer.from(hash.slice(2), 'hex')
  return cidToString(cidFromBlakeHash(hashBuffer))
}
