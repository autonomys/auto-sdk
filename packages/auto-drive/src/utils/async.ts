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
