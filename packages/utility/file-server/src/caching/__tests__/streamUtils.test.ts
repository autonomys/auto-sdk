import { jest } from '@jest/globals'
import { once } from 'events'
import { Readable } from 'stream'
import { createErrorResilientStream } from '../streamUtils.js'

const STALL_TIMEOUT = 30_000
const HEALTH_CHECK_INTERVAL = 5_000
const PAST_STALL_TIMEOUT = STALL_TIMEOUT + HEALTH_CHECK_INTERVAL
const STALLED = 'Stream stalled - no activity detected'
const CHUNK = Buffer.alloc(64 * 1024)
// More than the wrapper buffers, so an unread stream leaves the source holding data
const CHUNKS = 8

const eventLoopTurn = () => new Promise((resolve) => setImmediate(resolve))

const wrap = (source: Readable) =>
  createErrorResilientStream(source, {
    stallTimeout: STALL_TIMEOUT,
    healthCheckInterval: HEALTH_CHECK_INTERVAL,
  })

const consume = (stream: Readable) => {
  const consumed = { bytes: 0, errors: [] as string[] }
  stream.on('data', (chunk: Buffer) => {
    consumed.bytes += chunk.length
  })
  stream.on('error', (error) => {
    consumed.errors.push(error.message)
  })
  return consumed
}

describe('createErrorResilientStream', () => {
  beforeEach(() => {
    // Streams schedule their own work with nextTick and setImmediate
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('errors when the source goes silent while the consumer is reading', async () => {
    const source = new Readable({ read() {} })
    const consumed = consume(wrap(source))

    source.push(CHUNK)
    await eventLoopTurn()
    jest.advanceTimersByTime(PAST_STALL_TIMEOUT)
    await eventLoopTurn()

    expect(consumed).toEqual({ bytes: CHUNK.length, errors: [STALLED] })
  })

  it.each([
    ['is paused with data left', Array.from({ length: CHUNKS }, () => CHUNK)],
    ['has ended', [Buffer.alloc(1024)]],
  ])(
    'keeps the stream open, with no timer running, while nothing is read and the source %s',
    async (_, chunks) => {
      const stream = wrap(Readable.from(chunks))

      await eventLoopTurn()
      jest.advanceTimersByTime(PAST_STALL_TIMEOUT)

      expect(stream.destroyed).toBe(false)
      expect(stream.healthCheck?.().isStalled).toBe(false)
      // A consumer that never comes back must not leave a timer holding the stream
      expect(jest.getTimerCount()).toBe(0)

      const consumed = consume(stream)
      await once(stream, 'end')
      expect(consumed).toEqual({ bytes: Buffer.concat(chunks).length, errors: [] })
    },
  )

  it('errors when the source goes silent after the consumer resumes', async () => {
    const source = new Readable({ read() {} })
    const stream = wrap(source)
    source.push(CHUNK)

    await eventLoopTurn()
    jest.advanceTimersByTime(PAST_STALL_TIMEOUT)
    expect(stream.destroyed).toBe(false)

    const consumed = consume(stream)
    await eventLoopTurn()
    expect(consumed.bytes).toBe(CHUNK.length)
    // The source gets the whole timeout again, however long the consumer was away
    jest.advanceTimersByTime(STALL_TIMEOUT)
    await eventLoopTurn()
    expect(consumed.errors).toEqual([])

    jest.advanceTimersByTime(HEALTH_CHECK_INTERVAL)
    await eventLoopTurn()
    expect(consumed.errors).toEqual([STALLED])
  })

  it('errors when the source was destroyed while nothing was read', async () => {
    const source = new Readable({ read() {} })
    const stream = wrap(source)
    for (let i = 0; i < CHUNKS; i++) source.push(CHUNK)

    await eventLoopTurn()
    source.destroy()
    const consumed = consume(stream)
    await eventLoopTurn()
    jest.advanceTimersByTime(PAST_STALL_TIMEOUT)
    await eventLoopTurn()

    expect(consumed).toEqual({ bytes: CHUNK.length, errors: [STALLED] })
  })

  it('destroys a paused source when the consumer destroys the stream', async () => {
    const source = new Readable({ read() {} })
    const stream = wrap(source)
    for (let i = 0; i < CHUNKS; i++) source.push(CHUNK)

    await eventLoopTurn()
    expect(source.isPaused()).toBe(true)
    stream.destroy()
    await eventLoopTurn()

    expect(source.destroyed).toBe(true)
  })
})
