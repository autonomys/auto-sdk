import { PassThrough, Readable } from 'stream'

export type AwaitIterable<T> = AsyncIterable<T> | Iterable<T>

export const asyncIterableMap = async <T, R>(
  iterable: AwaitIterable<T>,
  fn: (value: T) => Promise<R>,
): Promise<R[]> => {
  const result = []
  for await (const value of iterable) {
    result.push(await fn(value))
  }
  return result
}

export const asyncIterableForEach = async <T>(
  iterable: AwaitIterable<T>,
  fn: (value: T[]) => Promise<void>,
  concurrency: number,
): Promise<void> => {
  let batch: T[] = []
  for await (const value of iterable) {
    batch.push(value)
    if (batch.length === concurrency) {
      await fn(batch)
      batch = []
    }
  }

  if (batch.length > 0) {
    await fn(batch)
  }
}

export const asyncIterableToPromiseOfArray = async <T>(
  iterable: AwaitIterable<T>,
): Promise<T[]> => {
  const result = []
  for await (const value of iterable) {
    result.push(value)
  }
  return result
}

export const bufferToAsyncIterable = (buffer: Buffer): AsyncIterable<Buffer> => {
  return (async function* () {
    yield buffer
  })()
}

export const asyncIterableToBuffer = async (iterable: AwaitIterable<Buffer>): Promise<Buffer> => {
  let buffer = Buffer.alloc(0)
  for await (const chunk of iterable) {
    buffer = Buffer.concat([buffer, chunk])
  }
  return buffer
}

export const asyncByChunk = async function* (
  iterable: AwaitIterable<Buffer>,
  chunkSize: number,
  ignoreLastChunk: boolean = false,
): AsyncIterable<Buffer> {
  let accumulated = Buffer.alloc(0)
  for await (const chunk of iterable) {
    accumulated = Buffer.concat([accumulated, chunk])
    while (accumulated.length >= chunkSize) {
      yield accumulated.subarray(0, chunkSize)
      accumulated = accumulated.subarray(chunkSize)
    }
  }

  if (accumulated.length > 0 && !ignoreLastChunk) {
    yield accumulated
  }
}

export async function forkAsyncIterable(
  asyncIterable: AwaitIterable<Uint8Array>,
): Promise<[Readable, Readable]> {
  const passThrough1 = new PassThrough()
  const passThrough2 = new PassThrough()

  for await (const chunk of asyncIterable) {
    passThrough1.write(chunk)
    passThrough2.write(chunk)
  }
  passThrough1.end()
  passThrough2.end()

  return [passThrough1, passThrough2]
}

export const asyncFromStream = async function* (
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<Buffer> {
  const reader = stream.getReader()
  let result = await reader.read()
  while (!result.done) {
    yield Buffer.from(result.value)
    result = await reader.read()
  }
}

export const bufferToIterable = async function* (buffer: Buffer): AsyncIterable<Buffer> {
  yield buffer
}

export const fileToIterable = async function* (
  file: File | Blob,
  chunkSize: number = 1024 * 1024,
): AsyncIterable<Buffer> {
  for (let i = 0; i < file.size; i += chunkSize) {
    yield Buffer.from(await file.slice(i, i + chunkSize).arrayBuffer())
  }
}
