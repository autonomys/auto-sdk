import { decodeNode } from '../../ipld/index.js'
import { IPLDNodeData } from './index.js'

export const encodeIPLDNodeData = (metadata: IPLDNodeData): Uint8Array => {
  return IPLDNodeData.encode(metadata)
}

export const decodeIPLDNodeData = (data: Uint8Array): IPLDNodeData => {
  const decoded = decodeNode(data)
  if (!decoded.Data) {
    throw new Error('Invalid data')
  }

  return IPLDNodeData.decode(decoded.Data)
}
