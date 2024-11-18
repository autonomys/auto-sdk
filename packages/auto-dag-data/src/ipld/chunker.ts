import type { BaseBlockstore } from 'blockstore-core'
import type { AwaitIterable } from 'interface-store'
import { CID } from 'multiformats'
import { cidOfNode } from '../cid/index.js'
import { decodeIPLDNodeData, FileUploadOptions, OffchainMetadata } from '../metadata/index.js'
import { stringifyMetadata } from '../utils/metadata.js'
import { Builders, fileBuilders, metadataBuilders } from './builders.js'
import { createFolderInlinkIpldNode, createFolderIpldNode } from './nodes.js'
import { chunkBuffer, encodeNode, PBNode } from './utils.js'

type ChunkerLimits = {
  maxNodeSize: number
  maxLinkPerNode: number
}

type ChunkerOptions = ChunkerLimits & FileUploadOptions

export const DEFAULT_NODE_MAX_SIZE = 65535

// u8 -> 1 byte (may grow in the future but unlikely further than 255)
const NODE_TYPE_SIZE = 1
// u32 -> 4 bytes
const NODE_LINK_DEPTH_SIZE = 4
// u64 -> 8 bytes
const NODE_SIZE_SIZE = 8
// Limit at 255 string length (Mac Limit)
const MAX_NAME_SIZE = 255
const END_OF_STRING_BYTE = 1
const NODE_NAME_SIZE = MAX_NAME_SIZE + END_OF_STRING_BYTE
// Upload options may be amplified in the future
const NODE_UPLOAD_OPTIONS_SIZE = 100
// Reserve 100 bytes for future use
const NODE_RESERVED_SIZE = 100

export const NODE_METADATA_SIZE =
  NODE_TYPE_SIZE +
  NODE_LINK_DEPTH_SIZE +
  NODE_SIZE_SIZE +
  NODE_NAME_SIZE +
  NODE_RESERVED_SIZE +
  NODE_UPLOAD_OPTIONS_SIZE

export const DEFAULT_MAX_CHUNK_SIZE = DEFAULT_NODE_MAX_SIZE - NODE_METADATA_SIZE

export const LINK_SIZE_IN_BYTES = 40
export const DEFAULT_MAX_LINK_PER_NODE = Math.floor(DEFAULT_MAX_CHUNK_SIZE / LINK_SIZE_IN_BYTES)

export const processFileToIPLDFormat = (
  blockstore: BaseBlockstore,
  file: AwaitIterable<Buffer>,
  totalSize: bigint,
  filename?: string,
  {
    maxNodeSize = DEFAULT_NODE_MAX_SIZE,
    maxLinkPerNode = DEFAULT_MAX_LINK_PER_NODE,
    encryption = undefined,
    compression = undefined,
  }: Partial<ChunkerOptions> = {
    maxNodeSize: DEFAULT_NODE_MAX_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
    encryption: undefined,
    compression: undefined,
  },
): Promise<CID> => {
  if (filename && filename.length > MAX_NAME_SIZE) {
    throw new Error(`Filename is too long: ${filename.length} > ${MAX_NAME_SIZE}`)
  }

  return processBufferToIPLDFormat(blockstore, file, filename, totalSize, fileBuilders, {
    maxNodeSize,
    maxLinkPerNode,
    encryption,
    compression,
  })
}

export const processMetadataToIPLDFormat = async (
  blockstore: BaseBlockstore,
  metadata: OffchainMetadata,
  limits: { maxNodeSize: number; maxLinkPerNode: number } = {
    maxNodeSize: DEFAULT_NODE_MAX_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
  },
): Promise<CID> => {
  if (metadata.name && metadata.name.length > MAX_NAME_SIZE) {
    throw new Error(`Filename is too long: ${metadata.name.length} > ${MAX_NAME_SIZE}`)
  }

  const buffer = Buffer.from(stringifyMetadata(metadata))

  return processBufferToIPLDFormat(
    blockstore,
    (async function* () {
      yield buffer
    })(),
    metadata.name,
    BigInt(buffer.byteLength),
    metadataBuilders,
    limits,
  )
}

const processBufferToIPLDFormat = async (
  blockstore: BaseBlockstore,
  buffer: AwaitIterable<Buffer>,
  filename: string | undefined,
  totalSize: bigint,
  builders: Builders,
  {
    maxNodeSize: maxNodeSize = DEFAULT_NODE_MAX_SIZE,
    maxLinkPerNode = DEFAULT_MAX_LINK_PER_NODE,
    encryption = undefined,
    compression = undefined,
  }: ChunkerOptions = {
    maxNodeSize: DEFAULT_NODE_MAX_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
    encryption: undefined,
    compression: undefined,
  },
): Promise<CID> => {
  if (filename && filename.length > MAX_NAME_SIZE) {
    throw new Error(`Filename is too long: ${filename.length} > ${MAX_NAME_SIZE}`)
  }

  const bufferChunks = chunkBuffer(buffer, { maxChunkSize: maxNodeSize - NODE_METADATA_SIZE })

  let CIDs: CID[] = []
  for await (const chunk of bufferChunks) {
    const node = builders.chunk(chunk)
    const cid = cidOfNode(node)
    await blockstore.put(cid, encodeNode(node))
    CIDs.push(cid)
  }

  return processBufferToIPLDFormatFromChunks(blockstore, CIDs, filename, totalSize, builders, {
    maxLinkPerNode,
    maxNodeSize,
    encryption,
    compression,
  })
}

export const processBufferToIPLDFormatFromChunks = async (
  blockstore: BaseBlockstore,
  chunks: AwaitIterable<CID>,
  filename: string | undefined,
  totalSize: bigint,
  builders: Builders,
  {
    maxNodeSize: maxNodeSize = DEFAULT_NODE_MAX_SIZE,
    maxLinkPerNode = DEFAULT_MAX_LINK_PER_NODE,
    encryption = undefined,
    compression = undefined,
  }: Partial<ChunkerOptions> = {
    maxNodeSize: DEFAULT_NODE_MAX_SIZE,
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
    encryption: undefined,
    compression: undefined,
  },
): Promise<CID> => {
  if (filename && filename.length > MAX_NAME_SIZE) {
    throw new Error(`Filename is too long: ${filename.length} > ${MAX_NAME_SIZE}`)
  }

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
    const singleNode = builders.single(Buffer.from(data.data!), filename, {
      compression,
      encryption,
    })
    await blockstore.put(cidOfNode(singleNode), encodeNode(singleNode))
    const headCID = cidOfNode(singleNode)

    return headCID
  }

  let depth = 1
  while (CIDs.length > maxLinkPerNode) {
    const newCIDs: CID[] = []
    for (let i = 0; i < CIDs.length; i += maxLinkPerNode) {
      const chunk = CIDs.slice(i, i + maxLinkPerNode)

      const node = builders.inlink(chunk, chunk.length, depth, maxNodeSize)
      const cid = cidOfNode(node)
      await blockstore.put(cid, encodeNode(node))
      newCIDs.push(cid)
    }
    depth++
    CIDs = newCIDs
  }
  const head = builders.root(CIDs, totalSize, depth, filename, maxNodeSize, {
    compression,
    encryption,
  })
  const headCID = cidOfNode(head)
  await blockstore.put(headCID, encodeNode(head))

  return headCID
}

export const processFolderToIPLDFormat = async (
  blockstore: BaseBlockstore,
  children: CID[],
  name: string,
  size: bigint,
  {
    maxLinkPerNode = DEFAULT_MAX_LINK_PER_NODE,
    maxNodeSize: maxNodeSize = DEFAULT_NODE_MAX_SIZE,
    compression = undefined,
    encryption = undefined,
  }: Partial<ChunkerOptions> = {
    maxLinkPerNode: DEFAULT_MAX_LINK_PER_NODE,
    maxNodeSize: DEFAULT_NODE_MAX_SIZE,
    compression: undefined,
    encryption: undefined,
  },
): Promise<CID> => {
  if (name.length > MAX_NAME_SIZE) {
    throw new Error(`Filename is too long: ${name.length} > ${MAX_NAME_SIZE}`)
  }

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

  const node = createFolderIpldNode(cids, name, depth, size, maxNodeSize, {
    compression,
    encryption,
  })
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
  { maxChunkSize = DEFAULT_MAX_CHUNK_SIZE }: { maxChunkSize?: number } = {
    maxChunkSize: DEFAULT_MAX_CHUNK_SIZE,
  },
): Promise<Buffer> => {
  const bufferChunks = chunkBuffer(chunks, {
    maxChunkSize,
    ignoreLastChunk: false,
  })

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
  maxSize: number = DEFAULT_NODE_MAX_SIZE,
): PBNode => {
  const nodeSize = encodeNode(node).byteLength
  if (nodeSize > maxSize) {
    throw new Error(`Node is too large to fit in a single chunk: ${nodeSize} > ${maxSize}`)
  }

  return node
}
