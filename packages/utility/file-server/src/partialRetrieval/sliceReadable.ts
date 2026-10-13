import { PassThrough, Readable } from 'stream'

/**
 * Returns a stream of the `length` bytes of `readable` that start at offset
 * `start`, or fewer if `readable` ends first.
 *
 * `readable` is paused while the returned stream's consumer is behind, and
 * destroyed once the slice is complete or the returned stream is closed early
 * (for example, when the client disconnects), so whatever produces it stops
 * fetching. An error from `readable` before then rejects the returned promise
 * or, once the stream has been returned, destroys it with that error.
 */
export const sliceReadable = async (
  readable: Readable,
  start: number,
  length: number,
): Promise<Readable> => {
  return new Promise<Readable>((resolve, reject) => {
    let bytesRead = 0
    let bytesPushed = 0
    let cleanedUp = false
    let returned = false
    const pass = new PassThrough()

    function returnPass() {
      returned = true
      resolve(pass)
    }

    function cleanup() {
      if (cleanedUp) return
      cleanedUp = true
      readable.removeListener('data', onData)
      readable.removeListener('end', onEnd)
      readable.removeListener('error', onError)
    }

    function onData(chunk: Buffer) {
      let chunkStart = 0
      const chunkEnd = chunk.length

      if (bytesRead < start) {
        const skip = Math.min(start - bytesRead, chunk.length)
        bytesRead += skip
        chunkStart += skip
        if (chunkStart >= chunkEnd) {
          return
        }
      }

      const remaining = length - bytesPushed
      const available = chunkEnd - chunkStart
      const toPush = Math.min(remaining, available)

      let drained = true
      if (toPush > 0) {
        drained = pass.write(chunk.subarray(chunkStart, chunkStart + toPush))
        bytesPushed += toPush
        bytesRead += toPush
        chunkStart += toPush
      }

      if (bytesPushed >= length) {
        cleanup()
        pass.end()
        readable.destroy()
      } else {
        if (chunkStart < chunkEnd) {
          bytesRead += chunkEnd - chunkStart
        }
        if (!drained) {
          readable.pause()
          pass.once('drain', () => readable.resume())
        }
      }
    }

    function onEnd() {
      cleanup()
      pass.end()
    }

    function onError(err: Error) {
      cleanup()
      if (returned) {
        pass.destroy(err)
      } else {
        // The caller never receives `pass`, so nothing would handle an error
        // event on it: report the error through the rejection alone.
        reject(err)
        pass.destroy()
      }
    }

    readable.on('data', onData)
    readable.once('end', onEnd)
    readable.once('error', onError)

    pass.on('close', () => {
      if (!cleanedUp) {
        cleanup()
        readable.destroy()
      }
      returnPass()
    })
    setImmediate(returnPass)
  })
}
