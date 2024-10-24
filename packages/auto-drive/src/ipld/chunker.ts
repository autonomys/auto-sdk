import { PBNode } from '@ipld/dag-pb'
import { CID } from 'multiformats'
import { cidOfNode } from '../cid/index.js'
import { OffchainMetadata } from '../metadata/index.js'
import { Builders, fileBuilders, metadataBuilders } from './builders.js'
import { createFolderInlinkIpldNode, createFolderIpldNode } from './nodes.js'
import { chunkBuffer, encodeNode } from './utils.js'

export const DEFAULT_MAX_CHUNK_SIZE = 1024 * 64
export const DEFAULT_MAX_LINK_PER_NODE = DEFAULT_MAX_CHUNK_SIZE / 64

export interface IPLDDag {
  headCID: CID
  nodes: Map<CID, PBNode>
}

export const createFileIPLDDag = (
  file: Buffer,
  filename?: string,
  { chunkSize, maxLinkPerNode }: { chunkSize: number; maxLinkPerNode: number } = {
    chunkSize: DEFAULT_MAX_CHUNK_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
  },
): IPLDDag => {
  return createBufferIPLDDag(file, filename, fileBuilders, { chunkSize, maxLinkPerNode })
}

export const createMetadataIPLDDag = (
  metadata: OffchainMetadata,
  limits: { chunkSize: number; maxLinkPerNode: number } = {
    chunkSize: DEFAULT_MAX_CHUNK_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
  },
): IPLDDag => {
  const buffer = Buffer.from(JSON.stringify(metadata))
  const name = `${metadata.name}.metadata.json`
  return createBufferIPLDDag(buffer, name, metadataBuilders, limits)
}

const createBufferIPLDDag = (
  buffer: Buffer,
  filename: string | undefined,
  builders: Builders,
  { chunkSize, maxLinkPerNode }: { chunkSize: number; maxLinkPerNode: number } = {
    chunkSize: DEFAULT_MAX_CHUNK_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
  },
): IPLDDag => {
  if (buffer.length <= chunkSize) {
    const head = builders.single(buffer, filename)
    const headCID = cidOfNode(head)
    return {
      headCID,
      nodes: new Map([[headCID, head]]),
    }
  }

  const bufferChunks = chunkBuffer(buffer, chunkSize)

  const nodes = new Map<CID, PBNode>()

  let CIDs: CID[] = bufferChunks.map((chunk) => {
    const node = builders.chunk(chunk)
    const cid = cidOfNode(node)
    nodes.set(cid, node)

    return cid
  })

  let depth = 1
  while (CIDs.length > maxLinkPerNode) {
    const newCIDs: CID[] = []
    for (let i = 0; i < CIDs.length; i += maxLinkPerNode) {
      const chunk = CIDs.slice(i, i + maxLinkPerNode)

      const node = builders.inlink(chunk, chunk.length, depth, chunkSize)
      const cid = cidOfNode(node)
      nodes.set(cid, node)
      newCIDs.push(cid)
    }
    depth++
    CIDs = newCIDs
  }
  const head = builders.root(CIDs, buffer.length, depth, filename, chunkSize)
  const headCID = cidOfNode(head)
  nodes.set(headCID, head)

  return {
    headCID,
    nodes,
  }
}

export const createFolderIPLDDag = (
  children: CID[],
  name: string,
  size: number,
  { maxLinkPerNode }: { maxLinkPerNode: number } = { maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE },
): IPLDDag => {
  const nodes = new Map<CID, PBNode>()
  let cids = children
  let depth = 0
  while (cids.length > maxLinkPerNode) {
    const newCIDs: CID[] = []
    for (let i = 0; i < cids.length; i += maxLinkPerNode) {
      const chunk = cids.slice(i, i + maxLinkPerNode)
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

export const ensureNodeMaxSize = (
  node: PBNode,
  maxSize: number = DEFAULT_MAX_CHUNK_SIZE,
): PBNode => {
  const nodeSize = encodeNode(node).byteLength
  if (nodeSize > maxSize) {
    throw new Error(`Node is too large to fit in a single chunk: ${nodeSize} > ${maxSize}`)
  }

  return node
}
