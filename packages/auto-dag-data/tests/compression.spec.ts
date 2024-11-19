import { AwaitIterable } from 'interface-store'
import { compressFile, COMPRESSION_CHUNK_SIZE, CompressionAlgorithm, decompressFile } from '../src'

const awaitIterable = async (it: AwaitIterable<Buffer>) => {
  for await (const _ of it);
}

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

  it('asynchronously iterates over the compressed file for chunked compression', async () => {
    const chunkSize = COMPRESSION_CHUNK_SIZE
    const chunks = 5
    const chunk = Buffer.from('hello'.repeat(chunkSize))
    const compressed = compressFile(
      (async function* () {
        for (let i = 0; i < chunks; i++) {
          yield chunk
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      })(),
      {
        level: 9,
        algorithm: CompressionAlgorithm.ZLIB,
      },
    )

    await awaitIterable(compressed)
  }, 10_000)

  it('throws an error if the compression algorithm is not supported', async () => {
    await expect(
      awaitIterable(compressFile([Buffer.from('hello')], { algorithm: 'efwhhgfew' as any })),
    ).rejects.toThrow('Unsupported compression algorithm')
  })

  it('throws an error if the compression level is invalid', async () => {
    await expect(
      awaitIterable(
        compressFile([Buffer.from('hello')], {
          algorithm: CompressionAlgorithm.ZLIB,
          level: -1 as any,
        }),
      ),
    ).rejects.toThrow('Invalid compression level')
  })

  it('throws an error if the chunk size is invalid', async () => {
    await expect(
      awaitIterable(
        compressFile([Buffer.from('hello')], {
          algorithm: CompressionAlgorithm.ZLIB,
          chunkSize: 0,
        }),
      ),
    ).rejects.toThrow('Invalid chunk size')
  })

  it('throws an error if the decompression algorithm is not supported', async () => {
    await expect(
      awaitIterable(decompressFile([Buffer.from('hello')], { algorithm: 'efwhhgfew' as any })),
    ).rejects.toThrow('Unsupported compression algorithm')
  })

  it('throws an error if the decompression chunk size is invalid', async () => {
    await expect(
      awaitIterable(
        decompressFile([Buffer.from('hello')], {
          chunkSize: 0,
          algorithm: CompressionAlgorithm.ZLIB,
        }),
      ),
    ).rejects.toThrow('Invalid chunk size')
  })

  it('throws an error if the compression level is invalid', async () => {
    await expect(
      awaitIterable(
        decompressFile([Buffer.from('hello')], {
          level: -1 as any,
          algorithm: CompressionAlgorithm.ZLIB,
        }),
      ),
    ).rejects.toThrow('Invalid compression level')
  })
})
