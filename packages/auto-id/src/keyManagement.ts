import { read, save } from '@autonomys/auto-utils'
import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import { KeyObject, createPrivateKey, createPublicKey, generateKeyPairSync } from 'crypto'

/**
 * Generates an RSA key pair.
 * @param keySize The size of the key in bits. Default is 2048.
 * @returns A tuple containing the the RSA private key and public key in PEM format.
 */
export function generateRsaKeyPair(keySize: number = 2048): [string, string] {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: keySize,
    publicExponent: 65537,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  return [privateKey, publicKey]
}

const crypto = new Crypto()

/**
 * Generates an Ed25519 key pair.
 * @returns A tuple containing the Ed25519 private key and public key in PEM format.
 */
export function generateEd25519KeyPair(): [string, string] {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  return [privateKey, publicKey]
}

// NOTE: 'RSA-OAEP', primarily for encryption/decryption. And 'RSASSA-PKCS1-v1_5' for signing and verification.
/**
 * Generates an RSA key pair for signing and returns CryptoKey objects.
 * @param keySize The size of the key in bits. Default is 2048.
 * @returns A promise that resolves to an object containing both the privateKey and publicKey as CryptoKey objects.
 */
// FIXME: keep one function. need to modify the tests.
export async function generateRsaKeyPair2(keySize: number = 2048): Promise<[CryptoKey, CryptoKey]> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: keySize, // can be 1024, 2048, or 4096
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: { name: 'SHA-256' },
    },
    true, // whether the key is extractable (i.e. can be exported)
    ['sign', 'verify'], // key usages
  )

  return [keyPair.privateKey, keyPair.publicKey]
}

/**
 * Generates an Ed25519 key pair for signing and returns CryptoKey objects.
 * @returns A promise that resolves to an object containing both the privateKey and publicKey as CryptoKey objects.
 */
// FIXME: keep one function. need to modify the tests.
export async function generateEd25519KeyPair2(): Promise<[CryptoKey, CryptoKey]> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true, // whether the key is extractable (i.e. can be exported)
    ['sign', 'verify'], // key usages
  )

  return [keyPair.privateKey, keyPair.publicKey]
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

// TODO: Add test for this function
export async function cryptoKeyToPem(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey(key.type === 'private' ? 'pkcs8' : 'spki', key)
  const base64 = arrayBufferToBase64(exported)
  const type = key.type === 'private' ? 'PRIVATE KEY' : 'PUBLIC KEY'
  const pem = `-----BEGIN ${type}-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END ${type}-----`
  return pem
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
    await save(filePath, pem)
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
 * Converts a PEM-encoded string to a public key object.
 *
 * @param pemData The PEM string to convert to a public key.
 * @returns The public key object.
 *
 * @example
 * const pemString = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...';
 * const publicKey = pemToPublicKey(pemString);
 * console.log('Public Key:', publicKey);
 */
export function pemToPublicKey(pemData: string): KeyObject {
  return createPublicKey({
    key: pemData,
    format: 'pem' as 'pem',
  })
}

/**
 * Loads a private key from a file. If the file is encrypted, a password must be provided.
 *
 * @param filePath Path to the private key file.
 * @param password Optional password used to decrypt the encrypted key file.
 * @returns The private key object.
 *
 * @example
 * async function main() {
 *   try {
 *     const privateKey = await loadPrivateKey('./path/to/private/key.pem', 'optional-password');
 *     console.log('Private Key:', privateKey);
 *   } catch (error) {
 *     console.error('Error loading private key:', error);
 *   }
 * }
 *
 * main();
 */
export async function loadPrivateKey(filePath: string, password?: string): Promise<KeyObject> {
  try {
    const keyData = await read(filePath)
    const privateKey = pemToPrivateKey(keyData, password)
    return privateKey
  } catch (error: any) {
    throw new Error(`Failed to load private key: ${error.message}`)
  }
}

/**
 * Loads a public key from a file.
 *
 * @param filePath Path to the public key file.
 * @returns The public key object.
 *
 * @example
 * async function main() {
 *   try {
 *     const publicKey = await loadPublicKey('./path/to/public/key.pem');
 *     console.log('Public Key:', publicKey);
 *   } catch (error) {
 *     console.error('Error loading public key:', error);
 *   }
 * }
 *
 * main();
 */
export async function loadPublicKey(filePath: string): Promise<KeyObject> {
  try {
    const keyData = await read(filePath)
    const publicKey = pemToPublicKey(keyData)
    return publicKey
  } catch (error: any) {
    throw new Error(`Failed to load public key: ${error.message}`)
  }
}

/**
 * Converts a private or public key to a hex string representation.
 *
 * @param key The key to convert (either a private or public key).
 * @returns The hex string representation of the key.
 *
 * @example
 * const keyHex = keyToHex(privateKeyObject); // privateKeyObject should be a valid KeyObject
 * console.log('Key Hex:', keyHex);
 */
export function keyToHex(key: KeyObject): string {
  let keyData: Buffer

  // Check the type of the key to determine how to handle it
  if (key.type === 'private') {
    // Convert private key to DER format
    keyData = key.export({
      type: 'pkcs8',
      format: 'der',
    })
  } else if (key.type === 'public') {
    // Convert public key to DER format
    keyData = key.export({
      type: 'spki',
      format: 'der',
    })
  } else {
    throw new Error('Unsupported key type')
  }

  // Convert the binary data to a hexadecimal string
  return keyData.toString('hex')
}
/**
 * Converts a PEM key (private or public key) to a hex string representation.
 * @param pem pem key
 * @returns hex string representation of the key
 * @example
 * const pem = '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANB ...';
 * const keyHex = pemToHex(pem); // --> 0x302a300506032b657003210012533ac395885661e254e171c3e5c57b38b122b1bec02dec4757bdec5566edd9
 *
 */
export function pemToHex(pem: string): string {
  const pemLines = pem.split('\n').filter((line) => line.trim() && !line.trim().startsWith('-----'))
  const base64Content = pemLines.join('')
  const buffer = Buffer.from(base64Content, 'base64')

  let keyData: Buffer

  if (pem.includes('BEGIN PRIVATE KEY')) {
    // Standard PKCS#8 format
    const privateKey = createPrivateKey({ key: buffer, format: 'der', type: 'pkcs8' })
    keyData = privateKey.export({ type: 'pkcs8', format: 'der' })
  } else if (pem.includes('BEGIN PUBLIC KEY')) {
    // Standard SPKI format
    const publicKey = createPublicKey({ key: buffer, format: 'der', type: 'spki' })
    keyData = publicKey.export({ type: 'spki', format: 'der' })
  } else if (pem.includes('BEGIN RSA PRIVATE KEY')) {
    // PKCS#1 format for RSA private keys
    const privateKey = createPrivateKey({ key: buffer, format: 'der', type: 'pkcs1' })
    keyData = privateKey.export({ type: 'pkcs1', format: 'der' })
  } else {
    throw new Error('Unsupported key format')
  }

  return '0x' + keyData.toString('hex')
}

enum KeyType {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

/**
 * Converts a PEM key (private or public key) to a CryptoKey format.
 * @param pem pem string
 * @returns private/public key in CryptoKey format
 */
export async function pemToCryptoKeyForSigning(
  pem: string,
  algorithmName: string,
): Promise<CryptoKey> {
  const [keyType, base64Final] = pemToArrayBuffer(pem)

  // TODO: auto-detect the signature algorithm retrieving OID from the onchain certificate.
  // Define common parameters
  const algorithm =
    // algorithmName === 'RSA-OAEP'   // CLEANUP: unsure so kept temporarily.
    algorithmName === 'RSASSA-PKCS1-v1_5'
      ? {
          // NOTE: RSA-OAEP is typically used for encryption, not signing. If RSA is
          // intended for signing, you should use RSASSA-PKCS1-v1_5 or another RSA signing variant.
          name: 'RSASSA-PKCS1-v1_5',
          hash: { name: 'SHA-256' },
        }
      : {
          name: 'Ed25519',
        }

  let formatType: 'pkcs8' | 'spki' | 'raw'
  // TODO: need to decide the key usages properly.
  let keyUsages: Iterable<KeyUsage>
  if (keyType === KeyType.PRIVATE) {
    formatType = 'pkcs8'
    keyUsages = ['decrypt']
  } else if (keyType === KeyType.PUBLIC) {
    formatType = 'spki'
    keyUsages = ['encrypt']
  }
  // else if (keyType === KeyType.RSA_PRIVATE) {
  //   formatType = 'jwk'
  //   keyUsages = ['decrypt']
  // }
  else {
    throw new Error('Unsupported key format')
  }

  // Import the key
  return crypto.subtle.importKey(
    formatType,
    base64Final,
    algorithm,
    true, // extractable
    keyUsages,
  )
}

/**
 * Checks if two public keys match.
 *
 * @param publicKey1 The first public key as a KeyObject.
 * @param publicKey2 The second public key as a KeyObject.
 * @returns True if the keys match, False otherwise.
 *
 * @example
 * const key1 = createPublicKey({
 *   key: publicKeyPem1,
 *   format: 'pem'
 * });
 * const key2 = createPublicKey({
 *   key: publicKeyPem2,
 *   format: 'pem'
 * });
 * const match = doPublicKeysMatch(key1, key2);
 * console.log('Keys match:', match);
 */
export function doPublicKeysMatch(publicKey1: KeyObject, publicKey2: KeyObject): boolean {
  // Serialize both public keys to DER format for comparison
  const publicKey1Der = publicKey1.export({
    type: 'spki',
    format: 'der',
  })

  const publicKey2Der = publicKey2.export({
    type: 'spki',
    format: 'der',
  })

  // Compare the serialized public key data
  return publicKey1Der.equals(publicKey2Der)
}

// TODO: finalize which function is to keep (from 'node's crypto' or 'webcrypto')
//      This can be done only after completing the AutoID package and testing
//      it to see which one is useful.
// export async function doPublicKeysMatch(
//   publicKey1: CryptoKey,
//   publicKey2: CryptoKey,
// ): Promise<boolean> {
//   const publicKey1Raw = new Uint8Array(await crypto.subtle.exportKey('spki', publicKey1))
//   const publicKey2Raw = new Uint8Array(await crypto.subtle.exportKey('spki', publicKey2))

//   const publicKey1Hex = Array.from(new Uint8Array(publicKey1Raw))
//     .map((byte) => byte.toString(16).padStart(2, '0'))
//     .join('')
//   const publicKey2Hex = Array.from(publicKey2Raw)
//     .map((byte) => byte.toString(16).padStart(2, '0'))
//     .join('')

//   return publicKey1Hex === publicKey2Hex
// }

export async function validateCertificatePublicKey(
  certPublicKey: x509.PublicKey,
  derivedPublicKey: CryptoKey,
): Promise<boolean> {
  const derivedPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('spki', derivedPublicKey),
  )

  const certPublicKeyHex = Array.from(new Uint8Array(certPublicKey.rawData))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  const derivedPublicKeyHex = Array.from(derivedPublicKeyRaw)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return certPublicKeyHex === derivedPublicKeyHex
}

/** ======= Utils ======= */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string) {
  // Node.js Buffer provides a more robust handling of base64.
  const buffer = Buffer.from(base64, 'base64')
  return new Uint8Array(buffer)
}

// get the key type & base64 final string from the PEM string (private or public key)
function stripPemHeaders(pem: string): string {
  return pem
    .replace(/-----BEGIN .*? KEY-----/g, '')
    .replace(/-----END .*? KEY-----/g, '')
    .replace(/\s+/g, '') // Remove all whitespace, including newlines and spaces
}

function pemToArrayBuffer(pem: string): [KeyType, Uint8Array] {
  let keyType: KeyType

  if (pem.includes('-----BEGIN PRIVATE KEY-----')) {
    keyType = KeyType.PRIVATE
  } else if (pem.includes('-----BEGIN PUBLIC KEY-----')) {
    keyType = KeyType.PUBLIC
  }
  // else if (pem.includes('-----BEGIN RSA PRIVATE KEY-----')) {
  //   keyType = KeyType.RSA_PRIVATE
  // }
  else {
    throw new Error('Unsupported key format')
  }

  return [keyType, base64ToArrayBuffer(stripPemHeaders(pem))]
}
