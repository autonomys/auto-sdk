import { decodeNode } from '../../ipld/index.ts'
import { IPLDNodeData } from './index.ts'

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
