import { decode } from '@ipld/dag-pb'
import { IPLDNodeData } from './protobuf/onchainMetadata.js'

export const encodeIPLDNodeData = (metadata: IPLDNodeData): Uint8Array => {
  return IPLDNodeData.encode(metadata)
}

export const decodeIPLDNodeData = (data: Uint8Array): IPLDNodeData => {
  const decoded = decode(data)
  if (!decoded.Data) {
    throw new Error('Invalid data')
  }

  return IPLDNodeData.decode(decoded.Data)
}
