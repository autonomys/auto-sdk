import { Crypto } from '@peculiar/webcrypto'
import { randomBytes } from 'crypto'
import { asyncByChunk } from '../utils/async.js'
import type { PickPartial } from '../utils/types.js'
import { EncryptorAlgorithm, EncryptorOptions, PasswordGenerationOptions } from './types.js'

const crypto = new Crypto()

export const ENCRYPTING_CHUNK_SIZE = 1024 * 1024
const IV_SIZE = 16
const TAG_SIZE = 16
const ENCRYPTED_CHUNK_SIZE = ENCRYPTING_CHUNK_SIZE + IV_SIZE + TAG_SIZE
const SALT_SIZE = 32

export const getKeyFromPassword = async ({ password, salt }: PasswordGenerationOptions) => {
  const encoder = new TextEncoder()
  const saltHash =
    typeof salt === 'string' ? await crypto.subtle.digest('SHA-256', encoder.encode(salt)) : salt

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltHash,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export const encryptFile = async function* (
  file: AsyncIterable<Buffer>,
  password: string,
  { chunkSize = ENCRYPTING_CHUNK_SIZE, algorithm }: PickPartial<EncryptorOptions, 'algorithm'>,
): AsyncIterable<Buffer> {
  if (algorithm !== EncryptorAlgorithm.AES_GCM) {
    throw new Error('Unsupported encryption algorithm')
  }

  const salt = randomBytes(SALT_SIZE)
  const key = await getKeyFromPassword({ password, salt })

  yield salt

  for await (const chunk of asyncByChunk(file, chunkSize)) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, chunk)
    yield Buffer.concat([Buffer.from(iv), Buffer.from(encrypted)])
  }
}

export const decryptFile = async function* (
  file: AsyncIterable<Buffer>,
  password: string,
  { chunkSize = ENCRYPTED_CHUNK_SIZE, algorithm }: PickPartial<EncryptorOptions, 'algorithm'>,
): AsyncIterable<Buffer> {
  if (algorithm !== EncryptorAlgorithm.AES_GCM) {
    throw new Error('Unsupported encryption algorithm')
  }

  let key: CryptoKey | undefined = undefined
  let chunks = Buffer.alloc(0)
  for await (const chunk of file) {
    chunks = Buffer.concat([chunks, chunk])

    if (chunks.length >= SALT_SIZE && !key) {
      const salt = chunks.subarray(0, 32)
      key = await getKeyFromPassword({ password, salt })
      chunks = chunks.subarray(SALT_SIZE)
    }

    while (key && chunks.length >= chunkSize) {
      const iv = chunks.subarray(0, IV_SIZE)
      const encryptedChunk = chunk.subarray(IV_SIZE, chunkSize)
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedChunk)
      chunks = chunks.subarray(chunkSize)
      yield Buffer.from(decrypted)
    }
  }

  if (key && chunks.length > 0) {
    const iv = chunks.subarray(0, IV_SIZE)
    const encryptedChunk = chunks.subarray(IV_SIZE, chunkSize)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedChunk)
    yield Buffer.from(decrypted)
  }
}
