import { Duplex, Readable } from 'stream'
import { forkStream, httpBodyToStream, streamToBuffer } from '../src/streams'

// Reads like the real consumers (pipeline, fs.writeFile), which also see an error raised
// before they started reading
const readAll = async (stream: Readable) => {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

const sourceFailingAfterFirstChunk = (error: Error) => {
  let pushedFirstChunk = false
  return new Readable({
    read() {
      if (pushedFirstChunk) {
        this.destroy(error)
      } else {
        pushedFirstChunk = true
        this.push(Buffer.from('first chunk'))
      }
    },
  })
}

const waitForClose = (stream: Readable) =>
  new Promise<void>((resolve) => stream.once('close', () => resolve()))

const nextMacrotask = () => new Promise((resolve) => setImmediate(resolve))

const { Readable: ReadableStreamV3 } = jest.requireActual<{ Readable: typeof Readable }>(
  'readable-stream',
)

describe('streams', () => {
  describe('forkStream', () => {
    it('should duplicate readable stream into two independent streams', async () => {
      const input = Buffer.from('parallel data stream')
      const source = Readable.from([input])

      const [branch1, branch2] = await forkStream(source)
      const [buf1, buf2] = await Promise.all([streamToBuffer(branch1), streamToBuffer(branch2)])

      expect(buf1).toEqual(input)
      expect(buf2).toEqual(input)
    })

    it('should forward a source error to both branches', async () => {
      const sourceError = new Error('upstream dropped')
      const source = sourceFailingAfterFirstChunk(sourceError)
      source.on('error', () => {})

      const [branch1, branch2] = await forkStream(source)

      await expect(readAll(branch1)).rejects.toBe(sourceError)
      await expect(readAll(branch2)).rejects.toBe(sourceError)
    })

    it('should forward a source error to branches that are consumed only after it', async () => {
      const sourceError = new Error('upstream dropped')
      const source = sourceFailingAfterFirstChunk(sourceError)

      const [branch1, branch2] = await forkStream(source)
      await waitForClose(source)

      await expect(readAll(branch1)).rejects.toBe(sourceError)
      await expect(readAll(branch2)).rejects.toBe(sourceError)
    })

    it('should error both branches when the source is destroyed before it ends', async () => {
      const source = new Readable({ read() {} })

      const [branch1, branch2] = await forkStream(source)
      source.push(Buffer.from('first chunk'))
      source.destroy()

      const prematureClose = { code: 'ERR_STREAM_PREMATURE_CLOSE' }
      await expect(readAll(branch1)).rejects.toMatchObject(prematureClose)
      await expect(readAll(branch2)).rejects.toMatchObject(prematureClose)
    })

    it('should error both branches when the source emits a chunk that is not bytes', async () => {
      const [branch1, branch2] = await forkStream(Readable.from([{ not: 'bytes' }]))

      const invalidChunk = { code: 'ERR_INVALID_ARG_TYPE' }
      await expect(readAll(branch1)).rejects.toMatchObject(invalidChunk)
      await expect(readAll(branch2)).rejects.toMatchObject(invalidChunk)
    })

    it('should end both branches when a duplex source closes after its readable side ends', async () => {
      const source = new Duplex({ read() {}, write: (_chunk, _encoding, callback) => callback() })

      const [branch1, branch2] = await forkStream(source)
      source.push(Buffer.from('all the data'))
      source.push(null)
      await new Promise((resolve) => source.once('end', resolve))
      source.destroy()
      await waitForClose(source)

      await expect(readAll(branch1)).resolves.toEqual(Buffer.from('all the data'))
      await expect(readAll(branch2)).resolves.toEqual(Buffer.from('all the data'))
    })

    it('should keep feeding one branch after the other is destroyed while holding back the source', async () => {
      const chunkSize = 64 * 1024
      const chunkCount = 64
      const source = Readable.from(
        Array.from({ length: chunkCount }, () => Buffer.alloc(chunkSize)),
      )

      const [unreadBranch, readBranch] = await forkStream(source)
      const readData = readAll(readBranch)
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(unreadBranch.readableLength).toBeGreaterThanOrEqual(unreadBranch.readableHighWaterMark)

      unreadBranch.destroy(new Error('client disconnected'))

      await expect(readData).resolves.toHaveLength(chunkSize * chunkCount)
    })

    it('should destroy the source once both branches are destroyed', async () => {
      const source = new Readable({ read() {} })
      const sourceClosed = waitForClose(source)

      const [branch1, branch2] = await forkStream(source)
      branch1.destroy()
      await waitForClose(branch1)
      expect(source.destroyed).toBe(false)

      branch2.destroy(new Error('cache write failed'))

      await sourceClosed
      expect(source.destroyed).toBe(true)
    })

    describe.each([
      { position: 'first', destroyedIndex: 0 },
      { position: 'second', destroyedIndex: 1 },
    ])(
      'when the $position branch is destroyed while the source has data ready',
      ({ destroyedIndex }) => {
        const chunkSize = 64 * 1024
        const chunkCount = 16
        const forkSourceWithDataReady = () =>
          forkStream(
            Readable.from(
              Array.from({ length: chunkCount }, () => Buffer.alloc(chunkSize)),
              { objectMode: false },
            ),
          )

        it('should keep feeding the other branch when destroyed right after the fork', async () => {
          const branches = await forkSourceWithDataReady()
          const otherBranchData = readAll(branches[1 - destroyedIndex])

          branches[destroyedIndex].destroy(new Error('cache write failed'))

          await expect(otherBranchData).resolves.toHaveLength(chunkSize * chunkCount)
        })

        it('should keep feeding the other branch when destroyed on a later microtask', async () => {
          const branches = await forkSourceWithDataReady()
          const otherBranchData = readAll(branches[1 - destroyedIndex])

          await Promise.resolve()
          branches[destroyedIndex].destroy(new Error('cache write failed'))

          await expect(otherBranchData).resolves.toHaveLength(chunkSize * chunkCount)
        })
      },
    )

    it.each([
      { kind: 'Node', createSource: () => new Readable({ read() {} }) },
      { kind: 'readable-stream v3', createSource: () => new ReadableStreamV3({ read() {} }) },
    ])(
      "should keep feeding a branch whose 'data' handler destroys the other branch, with a $kind source",
      async ({ createSource }) => {
        const source = createSource()
        const [readBranch, destroyedBranch] = await forkStream(source)
        const received: Buffer[] = []
        readBranch.on('data', (chunk) => {
          received.push(chunk)
          if (received.length === 2) {
            destroyedBranch.destroy(new Error('cache write failed'))
          }
        })
        const readBranchEnded = new Promise((resolve) => readBranch.once('end', resolve))

        // Pushing into a flowing source passes each chunk straight through to the read branch's
        // handler, so the destroy happens while the source is still emitting that chunk
        for (const chunk of ['a', 'b', 'c', 'd']) {
          await nextMacrotask()
          source.push(Buffer.from(chunk))
        }
        source.push(null)

        await readBranchEnded
        expect(Buffer.concat(received).toString()).toBe('abcd')
      },
    )
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
