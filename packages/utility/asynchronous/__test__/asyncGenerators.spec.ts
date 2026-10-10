import {
  asyncByChunk,
  asyncFromStream,
  asyncIterableToBuffer,
  fileToIterable,
} from '../src/asyncGenerators'

describe('asyncGenerators', () => {
  describe('asyncFromStream', () => {
    it('should consume a readable stream completely and release lock', async () => {
      const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4])]
      let cancelled = false
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk)
          }
          controller.close()
        },
        cancel() {
          cancelled = true
        },
      })

      const received: Buffer[] = []
      for await (const chunk of asyncFromStream(stream)) {
        received.push(chunk)
      }

      expect(Buffer.concat(received)).toEqual(Buffer.from([1, 2, 3, 4]))
      expect(stream.locked).toBe(false)
      expect(cancelled).toBe(false)
    })

    it('should release the stream lock on early break from consumer loop', async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1]))
          controller.enqueue(new Uint8Array([2]))
          controller.enqueue(new Uint8Array([3]))
        },
      })

      const received: Buffer[] = []
      for await (const chunk of asyncFromStream(stream)) {
        received.push(chunk)
        break
      }

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual(Buffer.from([1]))
      // The stream lock must be released so subsequent operations succeed
      expect(stream.locked).toBe(false)
    })

    it('should release the stream lock when consumer throws an error', async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1]))
          controller.enqueue(new Uint8Array([2]))
        },
      })

      await expect(async () => {
        for await (const _ of asyncFromStream(stream)) {
          throw new Error('Consumer error')
        }
      }).rejects.toThrow('Consumer error')

      expect(stream.locked).toBe(false)
    })
  })

  describe('asyncByChunk', () => {
    it('should chunk buffers into specified sizes', async () => {
      const input = [Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6, 7])]
      const chunks: Buffer[] = []

      for await (const chunk of asyncByChunk(input, 2)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual([
        Buffer.from([1, 2]),
        Buffer.from([3, 4]),
        Buffer.from([5, 6]),
        Buffer.from([7]),
      ])
    })

    it('should throw RangeError when chunkSize is zero or negative', async () => {
      const gen0 = asyncByChunk([Buffer.from([1, 2])], 0)
      await expect(gen0[Symbol.asyncIterator]().next()).rejects.toThrow(RangeError)

      const genNegative = asyncByChunk([Buffer.from([1, 2])], -1)
      await expect(genNegative[Symbol.asyncIterator]().next()).rejects.toThrow(RangeError)
    })
  })

  describe('fileToIterable', () => {
    it('should throw RangeError when chunkSize is zero or negative', async () => {
      const blob = new Blob([Buffer.from([1, 2, 3, 4])])
      const gen = fileToIterable(blob as any, 0)
      await expect(gen[Symbol.asyncIterator]().next()).rejects.toThrow(RangeError)
    })
  })
})
