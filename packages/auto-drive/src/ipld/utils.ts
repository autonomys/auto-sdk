import { decode, encode, PBNode } from '@ipld/dag-pb'

export const chunkBuffer = (buffer: Buffer, chunkSize: number) => {
  const chunks: Buffer[] = []

  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(Buffer.from(buffer.buffer.slice(i, i + chunkSize)))
  }

  return chunks
}

export const encodeNode = (node: PBNode): Buffer => Buffer.from(encode(node))

export const decodeNode = (data: Uint8Array): PBNode => decode(data)
