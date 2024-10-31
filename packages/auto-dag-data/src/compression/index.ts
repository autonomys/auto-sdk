import { Unzlib, Zlib } from 'fflate'
import { asyncByChunk } from '../utils/async.js'

export const COMPRESSION_CHUNK_SIZE = 1024 * 1024
type CompressionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export async function* compressFileByChunks(
  file: AsyncIterable<Buffer>,
  chunkSize = COMPRESSION_CHUNK_SIZE, // Default chunk size of 1 MB
  level: CompressionLevel = 9,
): AsyncIterable<Buffer> {
  const zlib = new Zlib({ level })
  const compressedChunks: Buffer[] = []

  zlib.ondata = (chunk) => {
    compressedChunks.push(Buffer.from(chunk))
  }

  for await (const chunk of asyncByChunk(file, chunkSize)) {
    zlib.push(chunk, false) // Push chunk data without marking as the end
    while (compressedChunks.length > 0) {
      yield compressedChunks.shift()! // Yield each compressed chunk
    }
  }

  zlib.push(new Uint8Array(), true) // Signal end of input with an empty Uint8Array
  while (compressedChunks.length > 0) {
    yield compressedChunks.shift()! // Yield remaining compressed chunks
  }
}

export async function* decompressFileByChunks(
  compressedFile: AsyncIterable<Buffer>,
  chunkSize = 1024 * 1024, // Default chunk size of 1 MB
): AsyncIterable<Buffer> {
  const unzlib = new Unzlib()
  const decompressedChunks: Buffer[] = []

  unzlib.ondata = (chunk) => {
    decompressedChunks.push(Buffer.from(chunk))
  }

  for await (const chunk of asyncByChunk(compressedFile, chunkSize)) {
    unzlib.push(chunk, false) // Push each chunk for decompression
    while (decompressedChunks.length > 0) {
      yield decompressedChunks.shift()! // Yield each decompressed chunk
    }
  }

  unzlib.push(new Uint8Array(), true) // Signal end of input with an empty Uint8Array
  while (decompressedChunks.length > 0) {
    yield decompressedChunks.shift()! // Yield remaining decompressed chunks
  }
}
