import { decryptFile, encryptFile } from '../src'
import { EncryptorAlgorithm } from '../src/encryption/types'

describe('encryption', () => {
  it('encrypts and decrypts a file with default chunk size', async () => {
    const chunk = 'hello'
    const file = Buffer.from(chunk.repeat(1000))
    const password = 'password'
    const salt = 'salt'

    const encrypted = encryptFile(
      (async function* () {
        yield file
      })(),
      password,
      {
        algorithm: EncryptorAlgorithm.AES_GCM,
      },
    )

    const decrypted = decryptFile(encrypted, password, {
      algorithm: EncryptorAlgorithm.AES_GCM,
    })

    let decryptedBuffer = Buffer.alloc(0)
    for await (const chunk of decrypted) {
      decryptedBuffer = Buffer.concat([decryptedBuffer, chunk])
    }

    expect(decryptedBuffer.toString()).toBe(file.toString())
  })

  it('encrypts and decrypts a file with custom chunk size', async () => {
    const chunk = 'hello'
    const file = Buffer.from(chunk.repeat(1000))
    const password = 'password'
    const salt = 'salt'
    const IV_SIZE = 16
    const TAG_SIZE = 16

    const encryptingSize = 100

    const encrypted = encryptFile(
      (async function* () {
        yield file
      })(),
      password,
      {
        algorithm: EncryptorAlgorithm.AES_GCM,
        chunkSize: encryptingSize,
      },
    )

    const decryptingSize = encryptingSize + IV_SIZE + TAG_SIZE

    const decrypted = decryptFile(encrypted, password, {
      algorithm: EncryptorAlgorithm.AES_GCM,
      chunkSize: decryptingSize,
    })

    let decryptedBuffer = Buffer.alloc(0)
    for await (const chunk of decrypted) {
      decryptedBuffer = Buffer.concat([decryptedBuffer, chunk])
    }

    expect(decryptedBuffer.toString()).toBe(file.toString())
  })
})
