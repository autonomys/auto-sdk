import { asyncIterableToBuffer } from '../src/asyncGenerators'

const chunkCount = 32
const chunkSize = 1024

const makeChunks = () => Array.from({ length: chunkCount }, (_, i) => Buffer.alloc(chunkSize, i))

const generate = async function* (chunks: Buffer[]) {
  for (const chunk of chunks) {
    yield chunk
  }
}

describe('asyncGenerators', () => {
  describe('asyncIterableToBuffer', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should return the bytes of every chunk in order', async () => {
      const chunks = makeChunks()

      const result = await asyncIterableToBuffer(generate(chunks))

      expect(result).toEqual(Buffer.concat(chunks))
    })

    it('should copy each input byte at most once', async () => {
      const chunks = makeChunks()
      const inputSize = chunkCount * chunkSize
      const concatSpy = jest.spyOn(Buffer, 'concat')

      await asyncIterableToBuffer(generate(chunks))

      const bytesCopied = concatSpy.mock.results.reduce(
        (total, result) => total + (result.value as Buffer).length,
        0,
      )
      expect(bytesCopied).toBeLessThanOrEqual(inputSize)
    })

    it('should return an empty buffer for an empty iterable', async () => {
      const result = await asyncIterableToBuffer(generate([]))

      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should reject when the iterable throws', async () => {
      const failing = async function* () {
        yield Buffer.from('partial')
        throw new Error('source failed')
      }

      await expect(asyncIterableToBuffer(failing())).rejects.toThrow('source failed')
    })
  })
})
