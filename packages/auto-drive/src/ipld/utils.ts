import { decode, encode, PBNode } from '@ipld/dag-pb'
import { AwaitIterable } from 'interface-store'

export const chunkBuffer = async function* (
  buffer: AwaitIterable<Buffer>,
  { maxChunkSize, ignoreLastChunk = false }: { maxChunkSize: number; ignoreLastChunk?: boolean },
): AsyncIterable<Buffer> {
  let target = Buffer.alloc(0)
  for await (let chunk of buffer) {
    target = Buffer.concat([target, chunk])
    while (target.length >= maxChunkSize) {
      yield target.subarray(0, maxChunkSize)
      target = target.subarray(maxChunkSize)
    }
  }
  if (target.length > 0 && !ignoreLastChunk) {
    yield target
  }
}

export const encodeNode = (node: PBNode): Buffer => Buffer.from(encode(node))

export const decodeNode = (data: Uint8Array): PBNode => decode(data)
