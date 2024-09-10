export const chunkBuffer = (buffer: Buffer, chunkSize: number) => {
  const chunks: Buffer[] = []

  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(Buffer.from(buffer.buffer.slice(i, i + chunkSize)))
  }

  return chunks
}
