import { CompressionAlgorithm, compressFile } from '@autonomys/auto-dag-data'
import { Readable } from 'stream'
import { deflateSync } from 'zlib'
import { createResponseBodyTransform } from '../responseBody.js'

const collect = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

describe('createResponseBodyTransform', () => {
  it('inflates the body when shouldDecompressBody is true (Node zlib format)', async () => {
    const original = Buffer.from('hello compressed world', 'utf8')
    const compressed = deflateSync(original)

    const transform = createResponseBodyTransform({ shouldDecompressBody: true })
    Readable.from([compressed]).pipe(transform)

    const result = await collect(transform)
    expect(result.toString('utf8')).toBe(original.toString('utf8'))
  })

  it('inflates bodies produced by the actual upload compression (fflate Zlib)', async () => {
    // The upload path compresses with fflate's `Zlib` (RFC 1950 zlib-wrapped deflate).
    // This proves createInflate() — not createInflateRaw() — is the correct decoder.
    const original = Buffer.from('the quick brown fox '.repeat(1000), 'utf8')
    const compressedChunks: Buffer[] = []
    for await (const chunk of compressFile(Readable.from([original]), {
      algorithm: CompressionAlgorithm.ZLIB,
    })) {
      compressedChunks.push(Buffer.from(chunk))
    }
    const compressed = Buffer.concat(compressedChunks)
    expect(compressed.length).toBeLessThan(original.length)

    const transform = createResponseBodyTransform({ shouldDecompressBody: true })
    Readable.from([compressed]).pipe(transform)

    const result = await collect(transform)
    expect(result.equals(original)).toBe(true)
  })

  it('passes the body through unchanged when shouldDecompressBody is false', async () => {
    const original = Buffer.from('raw bytes on the wire', 'utf8')

    const transform = createResponseBodyTransform({ shouldDecompressBody: false })
    Readable.from([original]).pipe(transform)

    const result = await collect(transform)
    expect(result.toString('utf8')).toBe(original.toString('utf8'))
  })
})
