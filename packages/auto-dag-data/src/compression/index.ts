import { asyncByChunk, AwaitIterable } from '@autonomys/asynchronous'
import { Unzlib, Zlib } from 'fflate'
import { CompressionAlgorithm } from '../metadata/index.js'
import type { PickPartial } from '../utils/types.js'
import { CompressionOptions } from './types.js'

export const COMPRESSION_CHUNK_SIZE = 1024 * 1024

export async function* compressFile(
  file: AwaitIterable<Buffer>,
  {
    level = 9,
    chunkSize = COMPRESSION_CHUNK_SIZE,
    algorithm,
  }: PickPartial<CompressionOptions, 'algorithm'>,
): AsyncIterable<Buffer> {
  if (algorithm !== CompressionAlgorithm.ZLIB) {
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

export async function* decompressFile(
  compressedFile: AwaitIterable<Buffer>,
  {
    chunkSize = COMPRESSION_CHUNK_SIZE,
    algorithm,
    level = 9,
  }: PickPartial<CompressionOptions, 'algorithm'>,
): AsyncIterable<Buffer> {
  if (algorithm !== CompressionAlgorithm.ZLIB) {
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
