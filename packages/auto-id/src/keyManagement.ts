import {
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from 'crypto'
import { readFileSync, writeFileSync } from 'fs'

/**
 * Generates an RSA key pair.
 * @param keySize The size of the key in bits. Default is 2048.
 * @returns A tuple containing the the RSA private key and public key.
 */
export function generateRsaKeyPair(keySize: number = 2048): [String, String] {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: keySize,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  console.log(privateKey)
  console.log(publicKey)

  return [privateKey, publicKey]
}

/**
 * Generates an Ed25519 key pair.
 * @returns A tuple containing the private and public keys as buffers.
 */
export function generateEd25519KeyPair(): [Buffer, Buffer] {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  return [Buffer.from(privateKey), Buffer.from(publicKey)]
}

/**
 * Saves a key to a file.
 * @param key The key to save as a buffer.
 * @param filePath The path of the file to save the key to.
 * @param password Optional password to encrypt the key. If provided, the key will be encrypted using AES-256-CBC.
 */
export function saveKey(key: Buffer, filePath: string, password?: string): void {
  if (password) {
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(password.padEnd(32)), randomBytes(16))
    const encrypted = Buffer.concat([cipher.update(key), cipher.final()])
    writeFileSync(filePath, encrypted)
  } else {
    writeFileSync(filePath, key)
  }
}

/**
 * Loads a private key from a file.
 * @param filePath The path of the file to load the private key from.
 * @param password Optional password to decrypt the key. If provided, the key will be decrypted using AES-256-CBC.
 * @returns The loaded private key as a buffer.
 */
export function loadPrivateKey(filePath: string, password?: string): Buffer {
  const key = readFileSync(filePath)
  if (password) {
    const decipher = createDecipheriv(
      'aes-256-cbc',
      Buffer.from(password.padEnd(32)),
      randomBytes(16),
    )
    return Buffer.concat([decipher.update(key), decipher.final()])
  }
  return key
}

/**
 * Loads a public key from a file.
 * @param filePath The path of the file to load the public key from.
 * @returns The loaded public key as a buffer.
 */
export function loadPublicKey(filePath: string): Buffer {
  return readFileSync(filePath)
}

/**
 * Checks if two public keys match.
 * @param publicKey1 The first public key as a buffer.
 * @param publicKey2 The second public key as a buffer.
 * @returns True if the public keys match, false otherwise.
 */
export function doPublicKeysMatch(publicKey1: Buffer, publicKey2: Buffer): boolean {
  return publicKey1.toString() === publicKey2.toString()
}
