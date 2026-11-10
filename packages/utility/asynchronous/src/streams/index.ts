import { Buffer } from 'buffer'
import { finished, PassThrough, Readable } from 'stream'

/**
 * Splits a readable stream into two branches that each receive every chunk, at the pace of
 * the slower branch. The branches are byte streams, so a source chunk that is not a string,
 * Buffer or Uint8Array errors both of them.
 *
 * If the source errors or is destroyed before it ends, both branches are destroyed with that
 * error. Read each branch with `pipeline()`, `for await` or your own `'error'` listener: a
 * branch that is only `.pipe()`d into a destination does not close that destination.
 *
 * A branch destroyed early is detached and the other keeps receiving data. If both branches are
 * gone before the source ends, the source is destroyed.
 */
export async function forkStream(stream: Readable): Promise<[Readable, Readable]> {
  const branches: [PassThrough, PassThrough] = [new PassThrough(), new PassThrough()]
  const branchesAwaitingDrain = new Set<PassThrough>()
  const stopAwaitingDrain = (branch: PassThrough) => {
    if (branchesAwaitingDrain.delete(branch) && branchesAwaitingDrain.size === 0) {
      stream.resume()
    }
  }

  let openBranches = branches.length
  for (const branch of branches) {
    // Source errors are forwarded to every branch, so a branch whose consumer has not
    // attached its own 'error' listener yet must not turn that into an unhandled error.
    branch.on('error', () => {})
    branch.on('drain', () => stopAwaitingDrain(branch))
    branch.once('close', () => {
      openBranches--
      if (openBranches > 0) {
        stopAwaitingDrain(branch)
      } else if (!stream.readableEnded) {
        // Once no branch is left, nothing will read the source, so release it.
        stream.destroy()
      }
    })
  }

  // Fans out by hand rather than with `pipe`, which can write to a branch that was destroyed but
  // has not closed yet, then pause the source for a 'drain' that never comes.
  stream.on('data', (chunk) => {
    for (const branch of branches) {
      if (branch.destroyed) {
        continue
      }
      try {
        if (!branch.write(chunk) && !branch.destroyed) {
          branchesAwaitingDrain.add(branch)
        }
      } catch (error) {
        stream.destroy(error as Error)
        return
      }
    }
    if (branchesAwaitingDrain.size > 0) {
      stream.pause()
    }
  })
  stream.once('end', () => {
    branches.forEach((branch) => branch.end())
  })

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
