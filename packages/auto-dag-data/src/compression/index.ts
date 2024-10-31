import { Unzlib, Zlib } from 'fflate'
import type { AwaitIterable } from 'interface-store'
import { asyncByChunk } from '../utils/async.js'
import { CompressionOptions } from './types.js'

export const COMPRESSION_CHUNK_SIZE = 1024 * 1024

export async function* compressFileByChunks(
  file: AwaitIterable<Buffer>,
  { level, chunkSize, algorithm = 'zlib' }: CompressionOptions,
): AsyncIterable<Buffer> {
  if (algorithm !== 'zlib') {
    throw new Error('Unsupported compression algorithm')
  }
  if (level < 0 || level > 9) {
    throw new Error('Invalid compression level')
  }
  if (chunkSize <= 0) {
    throw new Error('Invalid chunk size')
  }

  const zlib = new Zlib({ level })
  const compressedChunks: Buffer[] = []

  zlib.ondata = (chunk) => {
    compressedChunks.push(Buffer.from(chunk))
  }

  for await (const chunk of asyncByChunk(file, chunkSize)) {
    zlib.push(chunk, false)
    while (compressedChunks.length > 0) {
      yield compressedChunks.shift()!
    }
  }

  zlib.push(new Uint8Array(), true)
  while (compressedChunks.length > 0) {
    yield compressedChunks.shift()!
  }
}

export async function* decompressFileByChunks(
  compressedFile: AwaitIterable<Buffer>,
  { chunkSize, algorithm = 'zlib', level = 9 }: CompressionOptions,
): AsyncIterable<Buffer> {
  if (algorithm !== 'zlib') {
    throw new Error('Unsupported compression algorithm')
  }
  if (chunkSize <= 0) {
    throw new Error('Invalid chunk size')
  }
  if (level < 0 || level > 9) {
    throw new Error('Invalid compression level')
  }

  const unzlib = new Unzlib()
  const decompressedChunks: Buffer[] = []

  unzlib.ondata = (chunk) => {
    decompressedChunks.push(Buffer.from(chunk))
  }

  for await (const chunk of asyncByChunk(compressedFile, chunkSize)) {
    unzlib.push(chunk, false)
    while (decompressedChunks.length > 0) {
      yield decompressedChunks.shift()!
    }
  }

  unzlib.push(new Uint8Array(), true)
  while (decompressedChunks.length > 0) {
    yield decompressedChunks.shift()!
  }
}
