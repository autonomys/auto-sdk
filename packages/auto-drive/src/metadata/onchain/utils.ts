import { IPLDNodeData } from './protobuf/onchainMetadata.js'

export const encodeIPLDNodeData = (metadata: IPLDNodeData): Uint8Array => {
  return IPLDNodeData.encode(metadata)
}
