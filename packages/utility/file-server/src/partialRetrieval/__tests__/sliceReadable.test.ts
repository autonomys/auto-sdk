import { once } from 'events'
import { Readable } from 'stream'
import { sliceReadable } from '../sliceReadable.js'

const countingSource = (chunkCount: number, chunkSize: number) => {
  let produced = 0
  const source = new Readable({
    read() {
      if (produced === chunkCount) {
        this.push(null)
        return
      }
      produced++
      const chunk = Buffer.alloc(chunkSize, produced)
      setImmediate(() => this.push(chunk))
    },
  })
  return { source, produced: () => produced }
}

const collect = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

describe('sliceReadable', () => {
  it('stops reading the source once the slice is complete', async () => {
    const chunkCount = 250
    const { source, produced } = countingSource(chunkCount, 1000)
    const errors: Error[] = []
    source.on('error', (error) => errors.push(error))

    const slice = await sliceReadable(source, 0, 1)
    const received = await collect(slice)
    if (!source.closed) await once(source, 'close')

    expect(received).toEqual(Buffer.from([1]))
    expect(source.readableEnded).toBe(false)
    expect(produced()).toBeLessThan(chunkCount)
    expect(errors).toEqual([])
  })

  it('pauses the source while the consumer is behind', async () => {
    const chunkCount = 200
    const chunkSize = 64 * 1024
    const { source, produced } = countingSource(chunkCount, chunkSize)

    const slice = await sliceReadable(source, 0, chunkCount * chunkSize)
    await new Promise((resolve) => setTimeout(resolve, 50))
    const producedBeforeReading = produced()
    const received = await collect(slice)

    expect(producedBeforeReading).toBeLessThan(10)
    expect(received).toHaveLength(chunkCount * chunkSize)
  })

  it('stops reading the source when the slice is closed early', async () => {
    const chunkCount = 250
    const { source, produced } = countingSource(chunkCount, 1000)
    const errors: Error[] = []
    source.on('error', (error) => errors.push(error))

    const slice = await sliceReadable(source, 0, chunkCount * 1000)
    for await (const data of slice) {
      expect(data).toHaveLength(1000)
      break
    }
    await new Promise((resolve) => setImmediate(resolve))

    expect(source.destroyed).toBe(true)
    expect(produced()).toBeLessThan(chunkCount)
    expect(errors).toEqual([])
  })

  it('returns a slice that spans several source chunks', async () => {
    const { source } = countingSource(5, 4)

    const slice = await sliceReadable(source, 3, 6)

    expect(await collect(slice)).toEqual(Buffer.from([1, 2, 2, 2, 2, 3]))
  })

  it('ends early when the source ends before the slice is complete', async () => {
    const { source } = countingSource(2, 4)

    const slice = await sliceReadable(source, 6, 10)

    expect(await collect(slice)).toEqual(Buffer.from([2, 2]))
  })

  it('returns an empty stream when the start is past the end of the source', async () => {
    const { source } = countingSource(2, 4)

    const slice = await sliceReadable(source, 8, 1)

    expect(await collect(slice)).toHaveLength(0)
  })

  it('rejects, without an unhandled error, when the source fails before the slice is returned', async () => {
    const source = new Readable({
      read() {
        process.nextTick(() => this.destroy(new Error('chunk fetch failed')))
      },
    })

    await expect(sliceReadable(source, 0, 10)).rejects.toThrow('chunk fetch failed')
    await new Promise((resolve) => setImmediate(resolve))
  })

  it('destroys the slice with an error from the source', async () => {
    const source = new Readable({ read() {} })
    const slice = await sliceReadable(source, 0, 10)

    source.push(Buffer.from([1, 2]))
    source.destroy(new Error('chunk fetch failed'))

    await expect(collect(slice)).rejects.toThrow('chunk fetch failed')
  })
})
