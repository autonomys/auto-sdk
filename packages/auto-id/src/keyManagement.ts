import {
  KeyObject,
  createDecipheriv,
  createPrivateKey,
  generateKeyPairSync,
  randomBytes,
} from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import { writeFile } from 'fs/promises'

/**
 * Generates an RSA key pair.
 * @param keySize The size of the key in bits. Default is 2048.
 * @returns A tuple containing the the RSA private key and public key.
 */
export function generateRsaKeyPair(keySize: number = 2048): [string, string] {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: keySize,
    publicExponent: 65537,
    // TODO: Need to select the correct type - `"pkcs1" | "spki"`
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    // TODO: Need to select the correct type - `"pkcs1" | "pkcs8"`
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  return [privateKey, publicKey]
}

/**
 * Generates an Ed25519 key pair.
 * @returns A tuple containing the Ed25519 private key and public key.
 */
export function generateEd25519KeyPair(): [string, string] {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  return [privateKey, publicKey]
}

/**
 * Converts a cryptographic key object into a PEM formatted string.
 * This function can handle both private and public key objects.
 * For private keys, it supports optional encryption using a passphrase.
 *
 * @param key The cryptographic key object to be exported. It must be either a private or public key object.
 * @param password Optional passphrase for encrypting the private key. If provided, the private key
 *                 will be exported in an encrypted form using AES-256-CBC cipher. This parameter is ignored
 *                 for public keys.
 *
 * @returns Returns the PEM formatted string of the key. If a private key is provided with a passphrase,
 *          it returns the key in an encrypted format. Otherwise, it returns an unencrypted PEM.
 *
 * @throws Will throw an error if the provided `key` is neither a private nor a public key object.
 *
 * @example
 * Follow "../examples/eg3.ts" & "../examples/eg4.ts" for a complete example.
 * // Create a private key object (assuming you have the appropriate private key data)
 * const privateKey = createPrivateKey({
 *     key: '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANB ...',
 *     format: 'pem'
 * });
 *
 * // Create a public key object from the private key
 * const publicKey = createPublicKey(privateKey);
 *
 * // Export the private key without encryption
 * console.log(keyToPem(privateKey));
 *
 * // Export the private key with encryption
 * console.log(keyToPem(privateKey, 'your-secure-password'));
 *
 * // Export the public key
 * console.log(keyToPem(publicKey));
 */
export function keyToPem(key: KeyObject, password?: string): string {
  if (key.asymmetricKeyType) {
    // Handle private key
    if (key.type === 'private') {
      const options: any = {
        type: 'pkcs8' as 'pkcs8', // type for private keys
        format: 'pem' as 'pem', // Output format set to 'pem'
      }
      // If a password is provided, apply encryption
      if (password) {
        options.cipher = 'aes-256-cbc' // Cipher type
        options.passphrase = password // Passphrase as a string
      }
      return key.export(options) as string
    }
    // Handle public key
    else if (key.type === 'public') {
      const options = {
        type: 'spki' as 'spki', // type for public keys
        format: 'pem' as 'pem', // Output format set to 'pem'
      }
      return key.export(options) as string
    }
  }
  throw new Error('Invalid key type. Key must be a private or public key object.')
}

/**
 * Saves a cryptographic key object to a file in PEM format. If it's a private key and a password is provided,
 * the key will be encrypted before being written to the file.
 *
 * @param key The cryptographic key object to be saved. It must be either a private or public key object.
 * @param filePath The file system path where the key should be saved.
 * @param password Optional password for encrypting the private key.
 *
 * @example
 * // Assuming privateKey is a valid KeyObject
 * saveKey(privateKey, './myPrivateKey.pem', 'strongpassword')
 *   .then(() => console.log('Key saved successfully'))
 *   .catch(err => console.error('Error saving key:', err));
 */
export async function saveKey(key: KeyObject, filePath: string, password?: string): Promise<void> {
  try {
    const pem = keyToPem(key, password)
    await writeFile(filePath, pem, 'utf8') // Ensure the encoding is correct for PEM format
  } catch (e: any) {
    throw new Error(`Failed to save key: ${e.message}`)
  }
}

/**
 * Converts a PEM-encoded string to a private key object. If the PEM string is encrypted,
 * a password must be provided to decrypt it.
 *
 * @param pemData The PEM string to convert to a private key.
 * @param password Optional password used to decrypt the encrypted PEM string.
 * @returns The private key object.
 *
 * @example
 * const pemString = '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIFDjBABgkqhk ...';
 * const privateKey = pemToPrivateKey(pemString, 'mypassword');
 * console.log(privateKey);
 */
export function pemToPrivateKey(pemData: string, password?: string): KeyObject {
  const options: any = {
    key: pemData,
    format: 'pem' as 'pem',
  }

  // Add password to options if it is provided
  if (password) {
    options.passphrase = password
  }

  return createPrivateKey(options)
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
