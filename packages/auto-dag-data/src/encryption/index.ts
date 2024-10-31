import { Crypto } from '@peculiar/webcrypto'
import { asyncByChunk } from '../utils/async.js'

const crypto = new Crypto()

export const ENCRYPTING_CHUNK_SIZE = 1024 * 1024
const IV_SIZE = 16
const TAG_SIZE = 16
const ENCRYPTED_CHUNK_SIZE = ENCRYPTING_CHUNK_SIZE + IV_SIZE + TAG_SIZE

const getKeyFromPassword = async (password: string) => {
  const encoder = new TextEncoder()
  const passwordHash = await crypto.subtle.digest('SHA-256', encoder.encode(password))

  return await crypto.subtle.importKey('raw', passwordHash, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export const encryptFile = async function* (
  file: AsyncIterable<Buffer>,
  password: string,
): AsyncIterable<Buffer> {
  const key = await getKeyFromPassword(password)

  for await (const chunk of asyncByChunk(file, ENCRYPTING_CHUNK_SIZE)) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, chunk)
    console.log('encrypted: ', Buffer.from(encrypted).length)
    yield Buffer.concat([Buffer.from(iv), Buffer.from(encrypted)])
  }
}

export const decryptFile = async function* (
  file: AsyncIterable<Buffer>,
  password: string,
): AsyncIterable<Buffer> {
  const key = await getKeyFromPassword(password)

  for await (const chunk of asyncByChunk(file, ENCRYPTED_CHUNK_SIZE)) {
    const iv = chunk.subarray(0, IV_SIZE)
    const encryptedChunk = chunk.subarray(IV_SIZE, ENCRYPTED_CHUNK_SIZE)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedChunk)
    yield Buffer.from(decrypted)
  }
}
