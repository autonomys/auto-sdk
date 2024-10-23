import { PBNode } from '@ipld/dag-pb'
import { BaseBlockstore } from 'blockstore-core'
import { CID } from 'multiformats'
import { cidOfNode } from '../cid/index.js'
import { decodeIPLDNodeData, OffchainMetadata } from '../metadata/index.js'
import { Builders, fileBuilders, metadataBuilders } from './builders.js'
import { createFolderInlinkIpldNode, createFolderIpldNode } from './nodes.js'
import { chunkBuffer, encodeNode } from './utils.js'

export const DEFAULT_MAX_CHUNK_SIZE = 1024 * 64
export const DEFAULT_MAX_LINK_PER_NODE = DEFAULT_MAX_CHUNK_SIZE / 64

export const processFileToIPLDFormat = (
  blockstore: BaseBlockstore,
  file: AsyncIterable<Buffer>,
  filename?: string,
  { chunkSize, maxLinkPerNode }: { chunkSize: number; maxLinkPerNode: number } = {
    chunkSize: DEFAULT_MAX_CHUNK_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
  },
): Promise<CID> => {
  return processBufferToIPLDFormat(blockstore, file, filename, fileBuilders, {
    chunkSize,
    maxLinkPerNode,
  })
}

export const processMetadataToIPLDFormat = async (
  blockstore: BaseBlockstore,
  metadata: OffchainMetadata,
  limits: { chunkSize: number; maxLinkPerNode: number } = {
    chunkSize: DEFAULT_MAX_CHUNK_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
  },
): Promise<CID> => {
  const buffer = Buffer.from(JSON.stringify(metadata))
  const name = `${metadata.name}.metadata.json`
  return processBufferToIPLDFormat(
    blockstore,
    (async function* () {
      yield buffer
    })(),
    name,
    metadataBuilders,
    limits,
  )
}

const processBufferToIPLDFormat = async (
  blockstore: BaseBlockstore,
  buffer: AsyncIterable<Buffer>,
  filename: string | undefined,
  builders: Builders,
  { chunkSize, maxLinkPerNode }: { chunkSize: number; maxLinkPerNode: number } = {
    chunkSize: DEFAULT_MAX_CHUNK_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
  },
): Promise<CID> => {
  const bufferChunks = chunkBuffer(buffer, chunkSize)
  let totalSize = 0

  let CIDs: CID[] = []
  for await (const chunk of bufferChunks) {
    const node = builders.chunk(chunk)
    const cid = cidOfNode(node)
    await blockstore.put(cid, encodeNode(node))
    totalSize += chunk.byteLength
    CIDs.push(cid)
  }

  if (CIDs.length === 1) {
    const nodeBytes = await blockstore.get(CIDs[0])
    await blockstore.delete(CIDs[0])
    const data = decodeIPLDNodeData(nodeBytes)
    const singleNode = builders.single(Buffer.from(data.data!), filename)
    await blockstore.put(CIDs[0], encodeNode(singleNode))
    const headCID = cidOfNode(singleNode)

    return headCID
  }

  let depth = 1
  while (CIDs.length > maxLinkPerNode) {
    const newCIDs: CID[] = []
    for (let i = 0; i < CIDs.length; i += maxLinkPerNode) {
      const chunk = CIDs.slice(i, i + maxLinkPerNode)

      const node = builders.inlink(chunk, chunk.length, depth, chunkSize)
      const cid = cidOfNode(node)
      await blockstore.put(cid, encodeNode(node))
      newCIDs.push(cid)
    }
    depth++
    CIDs = newCIDs
  }
  const head = builders.root(CIDs, totalSize, depth, filename, chunkSize)
  const headCID = cidOfNode(head)
  await blockstore.put(headCID, encodeNode(head))

  return headCID
}

export const processFolderToIPLDFormat = async (
  blockstore: BaseBlockstore,
  children: CID[],
  name: string,
  size: number,
  { maxLinkPerNode }: { maxLinkPerNode: number } = { maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE },
): Promise<CID> => {
  let cids = children
  let depth = 0
  while (cids.length > maxLinkPerNode) {
    const newCIDs: CID[] = []
    for (let i = 0; i < cids.length; i += maxLinkPerNode) {
      const chunk = cids.slice(i, i + maxLinkPerNode)
      const node = createFolderInlinkIpldNode(chunk, depth)
      const cid = cidOfNode(node)
      await blockstore.put(cid, encodeNode(node))
      newCIDs.push(cid)
    }
    cids = newCIDs
    depth++
  }

  const node = createFolderIpldNode(cids, name, depth, size)
  const cid = cidOfNode(node)
  await blockstore.put(cid, encodeNode(node))

  return cid
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
