import { encode, PBNode } from '@ipld/dag-pb'
import { CID } from 'multiformats'
import { cidOfNode } from '../cid/index.js'
import {
  createChunkedFileIpldNode,
  createChunkIpldNode,
  createSingleFileIpldNode,
} from './nodes.js'
import { chunkBuffer, encodeNode } from './utils.js'

const MAX_CHUNK_SIZE = 1024 * 64

export interface IPLDDag {
  headCID: CID
  nodes: Map<CID, PBNode>
}

export const createFileIPLDDag = (
  file: Buffer,
  filename?: string,
  chunkSize: number = MAX_CHUNK_SIZE,
): IPLDDag => {
  if (file.length <= chunkSize) {
    const head = createSingleFileIpldNode(file, BigInt(file.length), filename)
    const headCID = cidOfNode(head)
    return {
      headCID,
      nodes: new Map([[headCID, head]]),
    }
  }

  const bufferChunks = chunkBuffer(file, chunkSize)

  const nodes = new Map<CID, PBNode>()

  const CIDs = bufferChunks.map((chunk) => {
    const node = createChunkIpldNode(chunk, BigInt(chunk.length))
    const cid = cidOfNode(node)
    nodes.set(cid, node)

    return cid
  })

  const head = createChunkedFileIpldNode(CIDs, BigInt(file.length), filename)

  if (encode(head).length <= chunkSize) {
    const headCID = cidOfNode(head)
    nodes.set(headCID, head)

    return {
      headCID,
      nodes,
    }
  }

  throw new Error('Not implemented support for large chunks')
}

export const ensureNodeMaxSize = (node: PBNode, maxSize: number = MAX_CHUNK_SIZE): PBNode => {
  const nodeSize = encodeNode(node).byteLength
  if (nodeSize > maxSize) {
    throw new Error(`Node is too large to fit in a single chunk: ${nodeSize} > ${maxSize}`)
  }

  return node
}
