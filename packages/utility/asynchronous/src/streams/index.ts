import { PassThrough, Readable } from 'stream'
import streamFork from 'stream-fork'

export async function forkStream(stream: Readable): Promise<[Readable, Readable]> {
  const passThrough1 = new PassThrough()
  const passThrough2 = new PassThrough()
  const writable = streamFork.fork([passThrough1, passThrough2])

  stream.pipe(writable)

  return [passThrough1, passThrough2]
}

export const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', (error) => reject(error))
  })
}

export const httpBodyToStream = (body: ReadableStream): Readable => {
  const reader = body.getReader()
  return new Readable({
    async read() {
      const { done, value } = await reader.read()
      if (done) {
        this.push(null)
      } else {
        this.push(value)
      }
    },
  })
}
