export type CompressionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type ZLibOptions = {
  algorithm: 'zlib'
  level: CompressionLevel
  chunkSize: number
}

export type CompressionOptions = ZLibOptions
