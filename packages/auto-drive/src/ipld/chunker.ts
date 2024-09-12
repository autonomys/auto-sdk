import { PBNode } from '@ipld/dag-pb'
import { CID } from 'multiformats'
import { cidOfNode } from '../cid/index.js'
import {
  createChunkedFileIpldNode,
  createChunkIpldNode,
  createFileInlinkIpldNode,
  createFolderInlinkIpldNode,
  createFolderIpldNode,
  createSingleFileIpldNode,
} from './nodes.js'
import { chunkBuffer, encodeNode } from './utils.js'

const MAX_CHUNK_SIZE = 1024 * 64
const MAX_LINK_PER_NODE = 4

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
    const head = createSingleFileIpldNode(file, file.length, filename)
    const headCID = cidOfNode(head)
    return {
      headCID,
      nodes: new Map([[headCID, head]]),
    }
  }

  const bufferChunks = chunkBuffer(file, chunkSize)

  const nodes = new Map<CID, PBNode>()

  let CIDs: CID[] = bufferChunks.map((chunk) => {
    const node = createChunkIpldNode(chunk, chunk.length)
    const cid = cidOfNode(node)
    nodes.set(cid, node)

    return cid
  })

  let depth = 1
  while (CIDs.length > MAX_LINK_PER_NODE) {
    const newCIDs: CID[] = []
    for (let i = 0; i < CIDs.length; i += MAX_LINK_PER_NODE) {
      const chunk = CIDs.slice(i, i + MAX_LINK_PER_NODE)

      const node = createFileInlinkIpldNode(chunk, chunk.length, depth)
      const cid = cidOfNode(node)
      nodes.set(cid, node)
      newCIDs.push(cid)
    }
    depth++
    CIDs = newCIDs
  }
  const head = createChunkedFileIpldNode(CIDs, file.length, depth, filename)
  const headCID = cidOfNode(head)
  nodes.set(headCID, head)

  return {
    headCID,
    nodes,
  }
}

export const createFolderIPLDDag = (children: CID[], name: string, size: number): IPLDDag => {
  const nodes = new Map<CID, PBNode>()
  let cids = children
  let depth = 0
  while (cids.length > MAX_LINK_PER_NODE) {
    const newCIDs: CID[] = []
    for (let i = 0; i < cids.length; i += MAX_LINK_PER_NODE) {
      const chunk = cids.slice(i, i + MAX_LINK_PER_NODE)
      const node = createFolderInlinkIpldNode(chunk, depth)
      const cid = cidOfNode(node)
      nodes.set(cid, node)
      newCIDs.push(cid)
    }
    cids = newCIDs
    depth++
  }

  const node = createFolderIpldNode(cids, name, depth, size)
  const cid = cidOfNode(node)
  nodes.set(cid, node)

  return {
    headCID: cid,
    nodes,
  }
}

export const ensureNodeMaxSize = (node: PBNode, maxSize: number = MAX_CHUNK_SIZE): PBNode => {
  const nodeSize = encodeNode(node).byteLength
  if (nodeSize > maxSize) {
    throw new Error(`Node is too large to fit in a single chunk: ${nodeSize} > ${maxSize}`)
  }

  return node
}
