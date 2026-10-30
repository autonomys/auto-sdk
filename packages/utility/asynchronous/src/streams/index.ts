import { finished, PassThrough, Readable } from 'stream'

export async function forkStream(stream: Readable): Promise<[Readable, Readable]> {
  const branches: [PassThrough, PassThrough] = [new PassThrough(), new PassThrough()]

  let openBranches = branches.length
  for (const branch of branches) {
    // Source errors are forwarded to every branch, so a branch whose consumer has not
    // attached its own 'error' listener yet must not turn that into an unhandled error.
    branch.on('error', () => {})
    // `pipe` unpipes a branch that closes early and keeps feeding the other one.
    // Once no branch is left, nothing will read the source, so release it.
    branch.once('close', () => {
      openBranches--
      if (openBranches === 0 && !stream.readableEnded) {
        stream.destroy()
      }
    })
    stream.pipe(branch)
  }

  // `pipe` neither forwards source errors nor ends the branches if the source is destroyed early
  finished(stream, { writable: false }, (error) => {
    if (error) {
      branches.forEach((branch) => branch.destroy(error))
    }
  })

  return branches
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
      try {
        const { done, value } = await reader.read()
        if (done) {
          this.push(null)
        } else {
          this.push(value)
        }
      } catch (error) {
        this.destroy(error instanceof Error ? error : new Error(String(error)))
      }
    },
    destroy(err, callback) {
      reader.cancel(err).catch(() => {})
      callback(err)
    },
  })
}
