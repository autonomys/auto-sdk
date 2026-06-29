import { AwaitIterable } from 'interface-store'
import { decryptFile, encryptFile, EncryptionAlgorithm } from '../src'

const awaitIterable = async (it: AwaitIterable<Buffer>) => {
  for await (const _ of it);
}

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
        algorithm: EncryptionAlgorithm.AES_256_GCM,
      },
    )

    const decrypted = decryptFile(encrypted, password, {
      algorithm: EncryptionAlgorithm.AES_256_GCM,
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
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        chunkSize: encryptingSize,
      },
    )

    const decryptingSize = encryptingSize + IV_SIZE + TAG_SIZE

    const decrypted = decryptFile(encrypted, password, {
      algorithm: EncryptionAlgorithm.AES_256_GCM,
      chunkSize: decryptingSize,
    })

    let decryptedBuffer = Buffer.alloc(0)
    for await (const chunk of decrypted) {
      decryptedBuffer = Buffer.concat([decryptedBuffer, chunk])
    }

    expect(decryptedBuffer.toString()).toBe(file.toString())
  })

  it('encrypts and decrypts a file with a password (with chunking)', async () => {
    const chunk = 'hello'
    const ONE_MB = 1024 * 1024
    const file = Buffer.from(chunk.repeat(2 * ONE_MB))
    const password = 'password'

    const encrypted = encryptFile(
      (async function* () {
        yield file
      })(),
      password,
      {
        algorithm: EncryptionAlgorithm.AES_256_GCM,
      },
    )

    let encryptedBuffer = Buffer.alloc(0)
    for await (const chunk of encrypted) {
      encryptedBuffer = Buffer.concat([encryptedBuffer, chunk])
    }

    const decrypted = decryptFile(
      (async function* () {
        yield encryptedBuffer
      })(),
      password,
      {
        algorithm: EncryptionAlgorithm.AES_256_GCM,
      },
    )

    let decryptedBuffer = Buffer.alloc(0)
    for await (const chunk of decrypted) {
      decryptedBuffer = Buffer.concat([decryptedBuffer, chunk])
    }
  })

  it('throws an error if the encryption algorithm is not supported', async () => {
    await expect(
      awaitIterable(
        encryptFile([Buffer.from('hello')], 'password', { algorithm: 'efwhhgfew' as any }),
      ),
    ).rejects.toThrow('Unsupported encryption algorithm')
  })

  it('throws an error if the decryption algorithm is not supported', async () => {
    await expect(
      awaitIterable(
        decryptFile([Buffer.from('hello')], 'password', { algorithm: 'efwhhgfew' as any }),
      ),
    ).rejects.toThrow('Unsupported encryption algorithm')
  })

  // Regression fixture: ciphertext produced by @peculiar/webcrypto 1.5.0 with
  // a known plaintext + password. Any WebCrypto implementation (peculiar,
  // node:crypto.webcrypto, browser) must be able to decrypt this byte-for-byte,
  // because PBKDF2-SHA256 and AES-GCM are fully specified by the WebCrypto
  // standard. If this test fails after a crypto-impl swap, encrypted data
  // produced by previous SDK versions would no longer be readable.
  it('decrypts a known fixture (cross-implementation regression)', async () => {
    const FIXTURE_PASSWORD = 'fixture-password-do-not-use-in-real-data'
    const FIXTURE_PLAINTEXT =
      'hello world — regression fixture for @peculiar/webcrypto cross-impl compat\n'
    const FIXTURE_HEX =
      '983c2e01435eccf98035fd6a24c1614a8a9a6872a879aad0bb3b9aae271674a5' +
      '2f3c26366cd21c108db66e4efc0692eca0e531f3b17ff0b699c2dfaa6909915b' +
      'f7f75d461694b846a7c72877aede1e3370bf105740a4a13e12260d75a581f7ee' +
      '2ea3a56952ebcc49e90ceb6fa90c47fce0f1a1f4a012757ee0fbe64809c4a5e3' +
      '58a639077eae865a02023a7929'

    const ciphertext = Buffer.from(FIXTURE_HEX, 'hex')
    const decrypted = decryptFile(
      (async function* () {
        yield ciphertext
      })(),
      FIXTURE_PASSWORD,
      { algorithm: EncryptionAlgorithm.AES_256_GCM },
    )

    let decryptedBuffer = Buffer.alloc(0)
    for await (const chunk of decrypted) {
      decryptedBuffer = Buffer.concat([decryptedBuffer, chunk])
    }

    expect(decryptedBuffer.toString('utf8')).toBe(FIXTURE_PLAINTEXT)
  })
})
