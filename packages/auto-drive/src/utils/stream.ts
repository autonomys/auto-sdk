import { WriteStream } from 'fs'

export const createWriteStreamAdapter = (
  nodeWriteStream: WriteStream,
): WritableStream<Uint8Array> => {
  return new WritableStream({
    write(chunk) {
      return new Promise((resolve, reject) => {
        nodeWriteStream.write(chunk, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    },
    close() {
      nodeWriteStream.end()
    },
    abort(err) {
      nodeWriteStream.destroy(err)
    },
  })
}
