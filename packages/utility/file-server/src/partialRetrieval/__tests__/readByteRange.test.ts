import { jest } from '@jest/globals'
import type { Request } from 'express'
import { Readable } from 'stream'
import { resolveByteRange } from '../../http/headers.js'
import { ByteRange, DownloadMetadata } from '../../models.js'
import { readByteRange } from '../readByteRange.js'

const collect = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

const file = Buffer.from(Array.from({ length: 10 }, (_, i) => i))
const layout = [
  { cid: 'cid1', start: 0, end: 2 },
  { cid: 'cid2', start: 3, end: 3 },
  { cid: 'cid3', start: 4, end: 7 },
  { cid: 'cid4', start: 8, end: 9 },
]
const chunks = layout.map(({ cid, start, end }) => ({ cid, size: BigInt(end - start + 1) }))
const dataOf = (cid: string) => {
  const { start, end } = layout.find((chunk) => chunk.cid === cid)!
  return file.subarray(start, end + 1)
}
const readChunks = (cids: string[]) => Readable.from(cids.map(dataOf))

describe('readByteRange', () => {
  it('reads exactly the requested bytes, fetching only the chunks that cover them', async () => {
    const ranges: ByteRange[] = []
    for (let start = 0; start < file.length; start++) {
      ranges.push([start, undefined], [start, file.length + 5])
      for (let end = start; end < file.length; end++) ranges.push([start, end])
    }

    for (const byteRange of ranges) {
      const [start, end] = byteRange
      const lastByte = Math.min(end ?? Infinity, file.length - 1)
      const requested: string[][] = []

      const stream = await readByteRange(chunks, byteRange, (cids) => {
        requested.push(cids)
        return readChunks(cids)
      })

      expect(await collect(stream)).toEqual(file.subarray(start, lastByte + 1))
      expect(requested).toEqual([
        layout
          .filter((chunk) => chunk.start <= lastByte && chunk.end >= start)
          .map((chunk) => chunk.cid),
      ])
    }
  })

  it.each<[string, number[]]>([
    ['bytes=0-0', [0]],
    ['bytes=2-5', [2, 3, 4, 5]],
    ['bytes=8-100', [8, 9]],
    ['bytes=7-', [7, 8, 9]],
    ['bytes=-3', [7, 8, 9]],
  ])('reads the range resolveByteRange resolves for %s', async (range, expected) => {
    const metadata: DownloadMetadata = {
      name: 'file',
      type: 'file',
      size: BigInt(file.length),
      isEncrypted: false,
      isCompressed: false,
    }
    const resolved = resolveByteRange({ headers: { range } } as unknown as Request, metadata)
    if (resolved.kind !== 'partial') throw new Error(`${range} resolved to ${resolved.kind}`)

    const stream = await readByteRange(chunks, resolved.byteRange, readChunks)

    expect(await collect(stream)).toEqual(Buffer.from(expected))
  })

  it('accepts a readChunks that resolves to the stream', async () => {
    const stream = await readByteRange(chunks, [2, 5], async (cids) => readChunks(cids))

    expect(await collect(stream)).toEqual(Buffer.from([2, 3, 4, 5]))
  })

  it('rejects without fetching when no chunk contains the start', async () => {
    const fetch = jest.fn(readChunks)

    await expect(readByteRange(chunks, [10, undefined], fetch)).rejects.toThrow(
      'Byte range not found',
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})
