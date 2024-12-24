import { Buffer } from 'buffer'

export const asyncByChunk = async function* (
  asyncIterable: AsyncIterable<Buffer>,
  chunkSize: number,
) {
  let buffer = Buffer.alloc(0)

  for await (const chunk of asyncIterable) {
    buffer = Buffer.concat([buffer, chunk])
    while (buffer.length >= chunkSize) {
      yield buffer.subarray(0, chunkSize)
      buffer = buffer.subarray(chunkSize)
    }
  }

  if (buffer.length > 0) {
    yield buffer
  }
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

export const fileToIterable = async function* (file: File | Blob): AsyncIterable<Buffer> {
  const chunkSize = 1024 * 1024
  for (let i = 0; i < file.size; i += chunkSize) {
    yield Buffer.from(await file.slice(i, i + chunkSize).arrayBuffer())
  }
}

export const bufferToIterable = async function* (buffer: Buffer): AsyncIterable<Buffer> {
  yield buffer
}
