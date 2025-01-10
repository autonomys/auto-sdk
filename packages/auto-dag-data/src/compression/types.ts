import { CompressionAlgorithm } from '../metadata/index.js'

export type CompressionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type ZLibOptions = {
  algorithm: CompressionAlgorithm.ZLIB
  level: CompressionLevel
  chunkSize: number
}

export type CompressionOptions = ZLibOptions
