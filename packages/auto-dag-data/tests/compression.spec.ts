import { compressFile, COMPRESSION_CHUNK_SIZE, CompressionAlgorithm, decompressFile } from '../src'

describe('compression', () => {
  it('compresses and decompresses a file with default options', async () => {
    const file = Buffer.from('hello'.repeat(1000))

    const compressed = compressFile(
      (async function* () {
        yield file
      })(),
      {
        algorithm: CompressionAlgorithm.ZLIB,
        level: 9,
      },
    )

    const decompressed = decompressFile(compressed, {
      algorithm: CompressionAlgorithm.ZLIB,
      level: 9,
    })

    let decompressedBuffer = Buffer.alloc(0)
    for await (const chunk of decompressed) {
      decompressedBuffer = Buffer.concat([decompressedBuffer, chunk])
    }

    expect(decompressedBuffer.toString()).toBe(file.toString())
  })

  it('compresses and decompresses a file with custom chunk size', async () => {
    const file = Buffer.from('hello'.repeat(1000))
    const chunkSize = 100

    const compressed = compressFile(
      (async function* () {
        yield file
      })(),
      {
        algorithm: CompressionAlgorithm.ZLIB,
        level: 9,
        chunkSize,
      },
    )

    const decompressed = decompressFile(compressed, {
      algorithm: CompressionAlgorithm.ZLIB,
      level: 9,
      chunkSize,
    })

    let decompressedBuffer = Buffer.alloc(0)
    for await (const chunk of decompressed) {
      decompressedBuffer = Buffer.concat([decompressedBuffer, chunk])
    }

    expect(decompressedBuffer.toString()).toBe(file.toString())
  })
})
