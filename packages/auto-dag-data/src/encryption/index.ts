import { Crypto } from '@peculiar/webcrypto'
import { AwaitIterable } from 'interface-store'
import { EncryptionAlgorithm, EncryptionOptions } from '../metadata/index.js'
import { asyncByChunk } from '../utils/async.js'
import type { PickPartial } from '../utils/types.js'
import { PasswordGenerationOptions } from './types.js'

export const crypto = typeof window === 'undefined' ? new Crypto() : window.crypto

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
  file: AwaitIterable<Buffer>,
  password: string,
  { chunkSize = ENCRYPTING_CHUNK_SIZE, algorithm }: PickPartial<EncryptionOptions, 'algorithm'>,
): AsyncIterable<Buffer> {
  if (algorithm !== EncryptionAlgorithm.AES_256_GCM) {
    throw new Error('Unsupported encryption algorithm')
  }

  const salt = crypto.getRandomValues(Buffer.alloc(SALT_SIZE))
  const key = await getKeyFromPassword({ password, salt })

  yield salt

  for await (const chunk of asyncByChunk(file, chunkSize)) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, chunk)
    yield Buffer.concat([Buffer.from(iv), Buffer.from(encrypted)])
  }
}

export const decryptFile = async function* (
  file: AwaitIterable<Buffer>,
  password: string,
  { chunkSize = ENCRYPTED_CHUNK_SIZE, algorithm }: PickPartial<EncryptionOptions, 'algorithm'>,
): AsyncIterable<Buffer> {
  if (algorithm !== EncryptionAlgorithm.AES_256_GCM) {
    throw new Error('Unsupported encryption algorithm')
  }

  let key: CryptoKey | undefined = undefined
  let chunks = Buffer.alloc(0)
  for await (const bufferSlice of file) {
    chunks = Buffer.concat([chunks, bufferSlice])

    if (chunks.length >= SALT_SIZE && !key) {
      const salt = chunks.subarray(0, SALT_SIZE)
      key = await getKeyFromPassword({ password, salt })
      chunks = chunks.subarray(SALT_SIZE)
    }

    while (key && chunks.length >= chunkSize) {
      const iv = chunks.subarray(0, IV_SIZE)
      const encryptedChunk = chunks.subarray(IV_SIZE, chunkSize)
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedChunk)
      chunks = chunks.subarray(chunkSize)
      yield Buffer.from(decrypted)
    }
  }

  if (key && chunks.length > 0) {
    const iv = chunks.subarray(0, IV_SIZE)
    const chunk = chunks.subarray(IV_SIZE, chunkSize)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, chunk)
    yield Buffer.from(decrypted)
  }
}
