import { decode, encode, PBNode } from '@ipld/dag-pb'

export const chunkBuffer = async function* (
  buffer: AsyncIterable<Buffer>,
  chunkSize: number,
): AsyncIterable<Buffer> {
  let target = Buffer.alloc(0)
  for await (let chunk of buffer) {
    target = Buffer.concat([target, chunk])
    while (target.length >= chunkSize) {
      yield target.subarray(0, chunkSize)
      target = target.subarray(chunkSize)
    }
  }
  if (target.length > 0) {
    yield target
  }
}

export const encodeNode = (node: PBNode): Buffer => Buffer.from(encode(node))

export const decodeNode = (data: Uint8Array): PBNode => decode(data)
