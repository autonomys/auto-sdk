import type { BaseBlockstore } from 'blockstore-core'
import type { AwaitIterable } from 'interface-store'
import { CID } from 'multiformats'
import { cidOfNode } from '../cid/index.js'
import { decodeIPLDNodeData, OffchainMetadata } from '../metadata/index.js'
import { Builders, fileBuilders, metadataBuilders } from './builders.js'
import { createFolderInlinkIpldNode, createFolderIpldNode } from './nodes.js'
import { chunkBuffer, encodeNode, PBNode } from './utils.js'

export const DEFAULT_MAX_CHUNK_SIZE = 64 * 1024

const ESTIMATED_LINK_SIZE_IN_BYTES = 64
export const DEFAULT_MAX_LINK_PER_NODE = DEFAULT_MAX_CHUNK_SIZE / ESTIMATED_LINK_SIZE_IN_BYTES

export const processFileToIPLDFormat = (
  blockstore: BaseBlockstore,
  file: AwaitIterable<Buffer>,
  totalSize: number,
  filename?: string,
  { maxChunkSize, maxLinkPerNode }: { maxChunkSize: number; maxLinkPerNode: number } = {
    maxChunkSize: DEFAULT_MAX_CHUNK_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
  },
): Promise<CID> => {
  return processBufferToIPLDFormat(blockstore, file, filename, totalSize, fileBuilders, {
    maxChunkSize,
    maxLinkPerNode,
  })
}

export const processMetadataToIPLDFormat = async (
  blockstore: BaseBlockstore,
  metadata: OffchainMetadata,
  limits: { maxChunkSize: number; maxLinkPerNode: number } = {
    maxChunkSize: DEFAULT_MAX_CHUNK_SIZE,
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
    buffer.byteLength,
    metadataBuilders,
    limits,
  )
}

const processBufferToIPLDFormat = async (
  blockstore: BaseBlockstore,
  buffer: AwaitIterable<Buffer>,
  filename: string | undefined,
  totalSize: number,
  builders: Builders,
  { maxChunkSize, maxLinkPerNode }: { maxChunkSize: number; maxLinkPerNode: number } = {
    maxChunkSize: DEFAULT_MAX_CHUNK_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
  },
): Promise<CID> => {
  const bufferChunks = chunkBuffer(buffer, { maxChunkSize })

  let CIDs: CID[] = []
  for await (const chunk of bufferChunks) {
    const node = builders.chunk(chunk)
    const cid = cidOfNode(node)
    await blockstore.put(cid, encodeNode(node))
    CIDs.push(cid)
  }

  return processBufferToIPLDFormatFromChunks(blockstore, CIDs, filename, totalSize, builders, {
    maxLinkPerNode,
    maxChunkSize,
  })
}

export const processBufferToIPLDFormatFromChunks = async (
  blockstore: BaseBlockstore,
  chunks: AwaitIterable<CID>,
  filename: string | undefined,
  totalSize: number,
  builders: Builders,
  { maxLinkPerNode, maxChunkSize }: { maxLinkPerNode: number; maxChunkSize: number } = {
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
    maxChunkSize: DEFAULT_MAX_CHUNK_SIZE,
  },
): Promise<CID> => {
  let chunkCount = 0
  let CIDs: CID[] = []
  for await (const chunk of chunks) {
    CIDs.push(chunk)
    chunkCount++
  }

  if (CIDs.length === 1) {
    const nodeBytes = await blockstore.get(CIDs[0])
    await blockstore.delete(CIDs[0])
    const data = decodeIPLDNodeData(nodeBytes)
    const singleNode = builders.single(Buffer.from(data.data!), filename)
    await blockstore.put(cidOfNode(singleNode), encodeNode(singleNode))
    const headCID = cidOfNode(singleNode)

    return headCID
  }

  let depth = 1
  while (CIDs.length > maxLinkPerNode) {
    const newCIDs: CID[] = []
    for (let i = 0; i < CIDs.length; i += maxLinkPerNode) {
      const chunk = CIDs.slice(i, i + maxLinkPerNode)

      const node = builders.inlink(chunk, chunk.length, depth, maxChunkSize)
      const cid = cidOfNode(node)
      await blockstore.put(cid, encodeNode(node))
      newCIDs.push(cid)
    }
    depth++
    CIDs = newCIDs
  }
  const head = builders.root(CIDs, totalSize, depth, filename, maxChunkSize)
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

/**
 * Process chunks to IPLD format, return the last chunk if it's not full
 * @returns the last chunk if it's not full, otherwise an empty buffer
 */
export const processChunksToIPLDFormat = async (
  blockstore: BaseBlockstore,
  chunks: AwaitIterable<Buffer>,
  builders: Builders,
  { maxChunkSize = DEFAULT_MAX_CHUNK_SIZE }: { maxChunkSize?: number },
): Promise<Buffer> => {
  const bufferChunks = chunkBuffer(chunks, { maxChunkSize, ignoreLastChunk: false })

  for await (const chunk of bufferChunks) {
    if (chunk.byteLength < maxChunkSize) {
      return chunk
    }

    const node = builders.chunk(chunk)
    const cid = cidOfNode(node)
    await blockstore.put(cid, encodeNode(node))
  }

  return Buffer.alloc(0)
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
