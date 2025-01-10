import type { AwaitIterable } from 'interface-store'

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
