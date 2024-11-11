import { blake3Hash } from '@webbuf/blake3'
import { WebBuf } from '@webbuf/webbuf'
import * as base32 from 'multiformats/bases/base32'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { create } from 'multiformats/hashes/digest'
import { encodeNode, PBNode } from '../ipld/utils.js'

export const BLAKE3_CODE = 0x1f

export const cidOfNode = (node: PBNode) => {
  const encodedNode = WebBuf.from(encodeNode(node))
  const hash = Buffer.from(blake3Hash(encodedNode).buf)
  return cidFromBlakeHash(hash)
}

export const cidToString = (cid: CID) => {
  return cid.toString(base32.base32)
}

export const stringToCid = (str: string) => {
  return CID.parse(str, base32.base32)
}

export const cidFromBlakeHash = (hash: Buffer) => {
  return CID.create(1, raw.code, create(BLAKE3_CODE, hash))
}

export const blake3HashFromCid = (cid: CID) => cid.multihash.digest
