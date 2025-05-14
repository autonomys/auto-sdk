import { PassThrough, Readable } from 'stream'
import streamFork from 'stream-fork'

export async function forkStream(stream: Readable): Promise<[Readable, Readable]> {
  const passThrough1 = new PassThrough()
  const passThrough2 = new PassThrough()
  const writable = streamFork.fork([passThrough1, passThrough2])

  stream.pipe(writable)

  return [passThrough1, passThrough2]
}
