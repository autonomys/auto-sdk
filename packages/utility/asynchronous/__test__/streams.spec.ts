import { Readable } from 'stream'
import { forkStream, httpBodyToStream, streamToBuffer } from '../src/streams'

describe('streams', () => {
  describe('streamToBuffer', () => {
    it('should convert readable stream to Buffer', async () => {
      const input = Buffer.from('hello world')
      const stream = Readable.from([input])
      const result = await streamToBuffer(stream)

      expect(result).toEqual(input)
    })

    it('should reject when stream emits error', async () => {
      const stream = new Readable({
        read() {
          this.destroy(new Error('stream read failed'))
        },
      })

      await expect(streamToBuffer(stream)).rejects.toThrow('stream read failed')
    })

    it('should reject if stream is already destroyed', async () => {
      const stream = new Readable({
        read() {},
      })
      stream.on('error', () => {})
      stream.destroy(new Error('early destroy'))

      await expect(streamToBuffer(stream)).rejects.toThrow('early destroy')
    })
  })

  describe('forkStream', () => {
    it('should duplicate readable stream into two independent streams', async () => {
      const input = Buffer.from('parallel data stream')
      const source = Readable.from([input])

      const [branch1, branch2] = await forkStream(source)
      const [buf1, buf2] = await Promise.all([streamToBuffer(branch1), streamToBuffer(branch2)])

      expect(buf1).toEqual(input)
      expect(buf2).toEqual(input)
    })
  })

  describe('httpBodyToStream', () => {
    it('should stream chunks from web ReadableStream', async () => {
      const chunks = [Buffer.from('chunk1'), Buffer.from('chunk2')]
      const webStream = new ReadableStream({
        start(controller) {
          chunks.forEach((chunk) => controller.enqueue(chunk))
          controller.close()
        },
      })

      const nodeStream = httpBodyToStream(webStream)
      const result = await streamToBuffer(nodeStream)

      expect(result).toEqual(Buffer.concat(chunks))
    })

    it('should catch read errors and emit error event on stream', async () => {
      const webStream = new ReadableStream({
        pull() {
          throw new Error('network read aborted')
        },
      })

      const nodeStream = httpBodyToStream(webStream)

      await expect(streamToBuffer(nodeStream)).rejects.toThrow('network read aborted')
    })

    it('should cancel underlying reader when node stream is destroyed', async () => {
      let cancelReason: unknown = null
      const webStream = new ReadableStream({
        start() {},
        cancel(reason) {
          cancelReason = reason
        },
      })

      const nodeStream = httpBodyToStream(webStream)
      nodeStream.on('error', () => {})
      const testError = new Error('client closed')
      nodeStream.destroy(testError)

      // Allow microtask ticks for cancel to run
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(cancelReason).toBe(testError)
    })
  })
})
