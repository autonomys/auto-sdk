import { Readable } from 'stream'
import { ByteRange } from '../models.js'
import { getNodesForPartialRetrieval, PartialRetrievalChunk } from './chunks.js'
import { sliceReadable } from './sliceReadable.js'

/**
 * Reads the inclusive `byteRange` of a file stored as `chunks`, listed in file
 * order, fetching only the chunks that cover it.
 *
 * `readChunks` is given the CIDs of those chunks and must return a stream of
 * their data concatenated in that order. Fetching stays with the caller; this
 * selects the chunks and slices the range out of their data.
 *
 * The range can be the clamped one from `resolveByteRange` or the unclamped one
 * from `getByteRange`: an end of `undefined`, or one past the last byte, reads to
 * the end of the file. The stream from `readChunks` is paused while the
 * returned stream's consumer is behind, and destroyed once the range has been
 * read or the returned stream is closed early.
 *
 * @throws (rejects) when no chunk contains the start of the range, before
 * `readChunks` is called.
 */
export const readByteRange = async (
  chunks: PartialRetrievalChunk[],
  byteRange: ByteRange,
  readChunks: (cids: string[]) => Readable | Promise<Readable>,
): Promise<Readable> => {
  const [start, end] = byteRange
  const { nodes, firstNodeFileOffset } = getNodesForPartialRetrieval(chunks, byteRange)
  const length = end == null ? Infinity : end - start + 1
  return sliceReadable(await readChunks(nodes), start - firstNodeFileOffset, length)
}
