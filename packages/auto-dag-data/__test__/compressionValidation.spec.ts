import { MemoryBlockstore } from 'blockstore-core'
import { randomBytes } from 'node:crypto'
import { deflateSync, zlibSync } from 'fflate'
import { deflateSync as nodeDeflateSync } from 'node:zlib'
import {
  compressFile,
  CompressionAlgorithm,
  decodeIPLDNodeData,
  decodeNode,
  decompressFile,
  EncryptionAlgorithm,
  isZlibCompressed,
  NODE_METADATA_SIZE,
  processFileToIPLDFormat,
} from '../src'

const collect = async (it: AsyncIterable<Buffer>): Promise<Buffer> => {
  let out = Buffer.alloc(0)
  for await (const chunk of it) {
    out = Buffer.concat([out, chunk])
  }
  return out
}

const bufferToIterable = (buffer: Buffer): AsyncIterable<Buffer> =>
  (async function* () {
    yield buffer
  })()

const compress = (buffer: Buffer): Promise<Buffer> =>
  collect(
    compressFile(bufferToIterable(buffer), {
      algorithm: CompressionAlgorithm.ZLIB,
      level: 9,
    }),
  )

// Reconstruct the raw stored bytes of a file from its head CID. Works for the
// single-chunk case (data lives on the head node) and the multi-chunk case
// where the head links directly to data chunks (no inlink layer).
const reconstructStoredBytes = async (
  blockstore: MemoryBlockstore,
  headCID: Parameters<MemoryBlockstore['get']>[0],
): Promise<Buffer> => {
  const head = decodeNode(await blockstore.get(headCID))
  const decodedHead = decodeIPLDNodeData(await blockstore.get(headCID))
  if (decodedHead.data && decodedHead.data.length > 0) {
    return Buffer.from(decodedHead.data)
  }
  const parts: Buffer[] = []
  for (const link of head.Links) {
    const decoded = decodeIPLDNodeData(await blockstore.get(link.Hash))
    parts.push(Buffer.from(decoded.data!))
  }
  return Buffer.concat(parts)
}

const headUploadOptions = async (
  blockstore: MemoryBlockstore,
  headCID: Parameters<MemoryBlockstore['get']>[0],
) => decodeIPLDNodeData(await blockstore.get(headCID)).uploadOptions

describe('isZlibCompressed', () => {
  it('returns true for a Node zlib.deflateSync stream', () => {
    const compressed = nodeDeflateSync(Buffer.from('hello world'.repeat(50)))
    expect(isZlibCompressed(compressed)).toBe(true)
  })

  it('returns true for an fflate zlibSync stream (what compressFile emits)', () => {
    const compressed = zlibSync(Buffer.from('hello world'.repeat(50)))
    expect(isZlibCompressed(compressed)).toBe(true)
  })

  it('returns true for genuine compressFile output', async () => {
    const compressed = await compress(Buffer.from('hello world'.repeat(50)))
    expect(isZlibCompressed(compressed)).toBe(true)
  })

  it('returns false for issue #169 PNG bytes (literal PNG signature + IHDR)', () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52,
    ])
    expect(isZlibCompressed(png)).toBe(false)
  })

  it('returns false for issue #169 JSON bytes', () => {
    const json = Buffer.from('{\n  "header": { "agentName": "openclaw-agent" }\n}')
    expect(isZlibCompressed(json)).toBe(false)
  })

  it('returns false for raw headerless deflate', () => {
    const raw = deflateSync(Buffer.from('hello world'.repeat(50)))
    expect(isZlibCompressed(raw)).toBe(false)
  })

  it('returns false for buffers shorter than 2 bytes and empty buffers', () => {
    expect(isZlibCompressed(new Uint8Array())).toBe(false)
    expect(isZlibCompressed(new Uint8Array([0x78]))).toBe(false)
  })
})

describe('chunker compression flag validation', () => {
  it('preserves the flag for genuinely compressed single-chunk input and round-trips', async () => {
    const original = Buffer.from('hello world'.repeat(100))
    const compressed = await compress(original)

    const blockstore = new MemoryBlockstore()
    const headCID = await processFileToIPLDFormat(
      blockstore,
      bufferToIterable(compressed),
      BigInt(compressed.length),
      'test.bin',
      { compression: { algorithm: CompressionAlgorithm.ZLIB, level: 9 } },
    )

    const opts = await headUploadOptions(blockstore, headCID)
    expect(opts?.compression?.algorithm).toBe(CompressionAlgorithm.ZLIB)

    const stored = await reconstructStoredBytes(blockstore, headCID)
    const roundTripped = await collect(
      decompressFile(bufferToIterable(stored), {
        algorithm: CompressionAlgorithm.ZLIB,
        level: 9,
      }),
    )
    expect(roundTripped.toString()).toBe(original.toString())
  })

  it('preserves the flag for genuinely compressed multi-chunk input and round-trips', async () => {
    // High-entropy (random) data does not compress, so the compressed stream
    // stays larger than one chunk and exercises the multi-chunk (builders.root)
    // branch with the root linking directly to data chunks (no inlink layer).
    const original = randomBytes(200_000)
    const compressed = await compress(original)

    const blockstore = new MemoryBlockstore()
    const headCID = await processFileToIPLDFormat(
      blockstore,
      bufferToIterable(compressed),
      BigInt(compressed.length),
      'test.bin',
      { compression: { algorithm: CompressionAlgorithm.ZLIB, level: 9 } },
    )

    const head = decodeNode(await blockstore.get(headCID))
    expect(head.Links.length).toBeGreaterThan(1)

    const opts = await headUploadOptions(blockstore, headCID)
    expect(opts?.compression?.algorithm).toBe(CompressionAlgorithm.ZLIB)

    const stored = await reconstructStoredBytes(blockstore, headCID)
    const roundTripped = await collect(
      decompressFile(bufferToIterable(stored), {
        algorithm: CompressionAlgorithm.ZLIB,
        level: 9,
      }),
    )
    expect(roundTripped.toString()).toBe(original.toString())
  })

  it('drops the flag for uncompressed single-chunk input (PNG) and stores plaintext verbatim', async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52,
    ])

    const blockstore = new MemoryBlockstore()
    const headCID = await processFileToIPLDFormat(
      blockstore,
      bufferToIterable(png),
      BigInt(png.length),
      'image.png',
      { compression: { algorithm: CompressionAlgorithm.ZLIB, level: 9 } },
    )

    const opts = await headUploadOptions(blockstore, headCID)
    expect(opts?.compression).toBeUndefined()

    const stored = await reconstructStoredBytes(blockstore, headCID)
    expect(Buffer.compare(stored, png)).toBe(0)
  })

  it('drops the flag for uncompressed multi-chunk input (JSON) and stores plaintext verbatim', async () => {
    const json = Buffer.from(
      '{\n  "header": { "agentName": "openclaw-agent" },\n  "body": "' + 'x'.repeat(5000) + '"\n}',
    )
    const maxNodeSize = 500 + NODE_METADATA_SIZE

    const blockstore = new MemoryBlockstore()
    const headCID = await processFileToIPLDFormat(
      blockstore,
      bufferToIterable(json),
      BigInt(json.length),
      'data.json',
      {
        compression: { algorithm: CompressionAlgorithm.ZLIB, level: 9 },
        maxNodeSize,
        maxLinkPerNode: 100000,
      },
    )

    const head = decodeNode(await blockstore.get(headCID))
    expect(head.Links.length).toBeGreaterThan(1)

    const opts = await headUploadOptions(blockstore, headCID)
    expect(opts?.compression).toBeUndefined()

    const stored = await reconstructStoredBytes(blockstore, headCID)
    expect(Buffer.compare(stored, json)).toBe(0)
  })

  it('leaves the encrypted + compressed path untouched (flag preserved despite non-zlib bytes)', async () => {
    // With encryption enabled the stored bytes are ciphertext, so they will not
    // look like a zlib stream. The validation must be skipped and the flag kept.
    const ciphertextLike = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52,
    ])

    const blockstore = new MemoryBlockstore()
    const headCID = await processFileToIPLDFormat(
      blockstore,
      bufferToIterable(ciphertextLike),
      BigInt(ciphertextLike.length),
      'secret.bin',
      {
        compression: { algorithm: CompressionAlgorithm.ZLIB, level: 9 },
        encryption: { algorithm: EncryptionAlgorithm.AES_256_GCM },
      },
    )

    const opts = await headUploadOptions(blockstore, headCID)
    expect(opts?.compression?.algorithm).toBe(CompressionAlgorithm.ZLIB)
    expect(opts?.encryption?.algorithm).toBe(EncryptionAlgorithm.AES_256_GCM)
  })
})
