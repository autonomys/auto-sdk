import { createNode, encode, PBNode } from '@ipld/dag-pb'
import { CID } from 'multiformats'
import { cidOfNode } from '../cid/index.js'
import { createChunkIpldNode, createSingleFileIpldNode } from './ipld.js'
import { chunkBuffer } from './utils.js'

const MAX_CHUNK_SIZE = 1024 * 64

export interface IPLDDag {
  headCID: CID
  nodes: Map<CID, PBNode>
}

export const fileToIpldPbDag = (file: Buffer, chunkSize: number = MAX_CHUNK_SIZE): IPLDDag => {
  if (file.length <= chunkSize) {
    const head = createSingleFileIpldNode(file)
    const headCID = cidOfNode(head)
    return {
      headCID,
      nodes: new Map([[headCID, head]]),
    }
  }

  const bufferChunks = chunkBuffer(file, chunkSize)

  const nodes = new Map<CID, PBNode>()

  const CIDs = bufferChunks.map((chunk) => {
    const node = createChunkIpldNode(chunk)
    const cid = cidOfNode(node)
    nodes.set(cid, node)

    return cid
  })

  const head = createNode(
    new Uint8Array([0x1, 0x1]),
    CIDs.map((cid) => ({ Hash: cid })),
  )

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
