import { ByteRange } from '../models.js'

/**
 * A chunk of a file's data, such as `ChunkInfo` from `OffchainMetadata.chunks` or a
 * file chunk's IPLD node metadata. A chunk without a size counts as empty.
 */
export interface PartialRetrievalChunk {
  cid: string
  size?: bigint | number
}

export interface PartialRetrievalNodes {
  /** CIDs of the chunks that cover the range, in file order. */
  nodes: string[]
  /** Offset in the file of the first byte of `nodes[0]`. */
  firstNodeFileOffset: number
}

/**
 * Selects the chunks of a file that cover the inclusive `byteRange`, given the
 * file's chunks in order. An end of `undefined`, or one past the last byte,
 * selects every chunk from the one containing the start to the end of the file.
 *
 * @throws when no chunk contains the start of the range.
 */
export const getNodesForPartialRetrieval = (
  chunks: PartialRetrievalChunk[],
  byteRange: ByteRange,
): PartialRetrievalNodes => {
  const [start, end] = byteRange
  let accumulatedLength = 0
  let firstNode: number | undefined
  let lastNode: number | undefined
  let firstNodeFileOffset = 0
  let i = 0

  while (firstNode === undefined && i < chunks.length) {
    const chunkSize = Number(chunks[i].size ?? 0)
    if (start >= accumulatedLength && start < accumulatedLength + chunkSize) {
      firstNode = i
      firstNodeFileOffset = accumulatedLength
    } else {
      accumulatedLength += chunkSize
      i++
    }
  }

  // Compared with null, not for truthiness, so that an end of 0 (`bytes=0-0`)
  // selects the first chunk rather than every chunk to the end of the file.
  if (end != null) {
    while (lastNode === undefined && i < chunks.length) {
      const chunkSize = Number(chunks[i].size ?? 0)
      if (end >= accumulatedLength && end < accumulatedLength + chunkSize) {
        lastNode = i
      }
      accumulatedLength += chunkSize
      i++
    }
  }

  if (firstNode === undefined) {
    throw new Error('Byte range not found')
  }

  const nodes = chunks
    .slice(firstNode, lastNode === undefined ? undefined : lastNode + 1)
    .map((chunk) => chunk.cid)

  return { nodes, firstNodeFileOffset }
}
