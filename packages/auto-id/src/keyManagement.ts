import { read, save } from '@autonomys/auto-utils'
import * as x509 from '@peculiar/x509'
import { asn1, pki, util } from 'node-forge'

const crypto = global.crypto

/**
 * NOTE: 'RSA-OAEP', primarily for encryption/decryption. And 'RSASSA-PKCS1-v1_5' for signing and verification.
 * Generates an RSA key pair for signing and returns CryptoKey objects.
 *
 * This function uses the Web Crypto API to generate an RSA key pair with the specified key size.
 * The generated keys are suitable for signing and verification operations.
 *
 * @param {number} [keySize=2048] - The size of the key in bits. Can be 1024, 2048, or 4096. Default is 2048.
 * @returns {Promise<CryptoKeyPair>} A promise that resolves to an array containing the privateKey and publicKey as CryptoKey objects.
 *
 * @example
 * // Generate an RSA key pair with the default key size (2048 bits)
 * const [privateKey, publicKey] = await generateRsaKeyPair();
 *
 * // Generate an RSA key pair with a custom key size (4096 bits)
 * const [privateKey, publicKey] = await generateRsaKeyPair(4096);
 */
export async function generateRsaKeyPair(keySize: number = 2048): Promise<CryptoKeyPair> {
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

  return keyPair
}

/**
 * Generates an Ed25519 key pair for signing and verification.
 *
 * This function uses the Web Crypto API to generate an Ed25519 key pair.
 * The generated keys are suitable for signing and verification operations.
 *
 * @returns {Promise<CryptoKeyPair>} A promise that resolves to an array containing the privateKey and publicKey as CryptoKey objects.
 *
 * @example
 * // Generate an Ed25519 key pair
 * const [privateKey, publicKey] = await generateEd25519KeyPair();
 */
export async function generateEd25519KeyPair(): Promise<CryptoKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true, // whether the key is extractable (i.e. can be exported)
    ['sign', 'verify'], // key usages
  )

  return keyPair
}

/**
 * Converts a CryptoKey object into a PEM formatted string.
 * This function can handle both private and public CryptoKey objects.
 * For private keys, it supports optional encryption using a passphrase.
 *
 * @param key The CryptoKey object to be exported. It must be either a private or public key object.
 * @param password Optional passphrase for encrypting the private key. If provided, the private key
 *                 will be exported in an encrypted form using AES-256-CBC cipher. This parameter is ignored
 *                 for public keys.
 *
 * @returns A promise that resolves to the PEM formatted string of the key. If a private key is provided with a passphrase,
 *          it returns the key in an encrypted format. Otherwise, it returns an unencrypted PEM.
 *
 * @throws Will throw an error if the provided `key` is neither a private nor a public key object.
 *
 * @example
 * // Generate an RSA key pair
 * const [privateKey, publicKey] = await generateRsaKeyPair();
 *
 * // Export the private key without encryption
 * const privateKeyPem = await cryptoKeyToPem(privateKey);
 * console.log(privateKeyPem);
 *
 * // Export the private key with encryption
 * const privateKeyPemEncrypted = await cryptoKeyToPem(privateKey, 'your-secure-password');
 * console.log(privateKeyPemEncrypted);
 *
 * // Export the public key
 * const publicKeyPem = await cryptoKeyToPem(publicKey);
 * console.log(publicKeyPem);
 */
export async function cryptoKeyToPem(key: CryptoKey, password?: string): Promise<string> {
  const exported = await crypto.subtle.exportKey(key.type === 'private' ? 'pkcs8' : 'spki', key)
  const base64 = arrayBufferToBase64(exported)
  const type = key.type === 'private' ? 'PRIVATE KEY' : 'PUBLIC KEY'
  let pem = `-----BEGIN ${type}-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END ${type}-----`

  if (password && key.type === 'private') {
    return encryptPem(pem, password)
  }

  return pem
}

/**
 * Saves a CryptoKey to a specified file in PEM format.
 *
 * This function converts the given CryptoKey to a PEM formatted string and saves it to the specified file path.
 * If a password is provided, the private key will be encrypted using AES-256-CBC cipher.
 *
 * @param {CryptoKey} key - The CryptoKey object to be saved.
 * @param {string} filePath - The path to the file where the key will be saved.
 * @param {string} [password] - Optional passphrase for encrypting the private key. This parameter is ignored for public keys.
 * @returns {Promise<void>} A promise that resolves when the key is successfully saved.
 *
 * @throws Will throw an error if the key cannot be saved.
 */
export async function saveKey(key: CryptoKey, filePath: string, password?: string): Promise<void> {
  try {
    const pem = await cryptoKeyToPem(key, password)
    await save(filePath, pem)
  } catch (e: any) {
    throw new Error(`Failed to save key: ${e.message}`)
  }
}

/**
 * Converts a PEM formatted private key to a CryptoKey object.
 *
 * This function imports a private key from a PEM formatted string and converts it to a CryptoKey object.
 * If the PEM data is encrypted, a password must be provided.
 *
 * @param {string} pemData - The PEM formatted private key string.
 * @param {AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams} algorithm - The algorithm identifier for the key.
 * @param {string} [password] - Optional passphrase for decrypting the encrypted key.
 * @returns {Promise<CryptoKey>} A promise that resolves to the private key as a CryptoKey object.
 *
 * @throws Will throw an error if the key cannot be imported.
 */
export async function pemToPrivateKey(
  pemData: string,
  algorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams,
  password?: string,
): Promise<CryptoKey> {
  let arrayBuffer
  if (password) {
    arrayBuffer = plainPemToArrayBuffer(decryptPem(pemData, password))
  } else {
    arrayBuffer = plainPemToArrayBuffer(pemData)
  }
  return crypto.subtle.importKey('pkcs8', arrayBuffer, algorithm, true, ['sign'])
}

/**
 * Converts a PEM formatted public key to a CryptoKey object.
 *
 * This function imports a public key from a PEM formatted string and converts it to a CryptoKey object.
 *
 * @param {string} pemData - The PEM formatted public key string.
 * @param {AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams} algorithm - The algorithm identifier for the key.
 * @returns {Promise<CryptoKey>} A promise that resolves to the public key as a CryptoKey object.
 *
 * @throws Will throw an error if the key cannot be imported.
 */
export async function pemToPublicKey(
  pemData: string,
  algorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams,
): Promise<CryptoKey> {
  const keyBuffer = Buffer.from(base64ToArrayBuffer(stripPemHeaders(pemData)))
  return crypto.subtle.importKey('spki', keyBuffer, algorithm, true, ['verify'])
}

/**
 * Loads a private key from a file and converts it to a CryptoKey object.
 * If the file is encrypted, a password must be provided.
 *
 * @param filePath - The path to the private key file.
 * @param algorithm - The algorithm identifier for the key.
 * @param password - Optional password used to decrypt the encrypted key file.
 * @returns A promise that resolves to the private key as a CryptoKey object.
 *
 * @throws Will throw an error if the private key cannot be loaded or converted.
 *
 * @example
 * // Load an RSA private key
 * const privateKey = await loadPrivateKey('./path/to/private/key.pem', {
 *   name: 'RSASSA-PKCS1-v1_5',
 *   hash: { name: 'SHA-256' },
 * });
 * console.log(privateKey);
 */
export async function loadPrivateKey(
  filePath: string,
  algorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams,
  password?: string,
): Promise<CryptoKey> {
  try {
    const keyData = await read(filePath)
    const privateKey = await pemToPrivateKey(keyData, algorithm, password)
    return privateKey
  } catch (error: any) {
    throw new Error(`Failed to load private key: ${error.message}`)
  }
}

/**
 * Loads a public key from a file and converts it to a CryptoKey object.
 *
 * @param filePath - The path to the public key file.
 * @param algorithm - The algorithm identifier for the key.
 * @returns A promise that resolves to the public key as a CryptoKey object.
 *
 * @throws Will throw an error if the public key cannot be loaded or converted.
 *
 * @example
 * // Load an RSA public key
 * const publicKey = await loadPublicKey('./path/to/public/key.pem', {
 *   name: 'RSASSA-PKCS1-v1_5',
 *   hash: { name: 'SHA-256' },
 * });
 * console.log(publicKey);
 */
export async function loadPublicKey(
  filePath: string,
  algorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams,
): Promise<CryptoKey> {
  try {
    const keyData = await read(filePath)
    const publicKey = await pemToPublicKey(keyData, algorithm)
    return publicKey
  } catch (error: any) {
    throw new Error(`Failed to load public key: ${error.message}`)
  }
}

/**
 * Converts a private or public CryptoKey to a hex string representation.
 *
 * @param key The CryptoKey to convert (either a private or public key).
 * @returns The hex string representation of the key.
 *
 * @example
 * const keyHex = await keyToHex(privateKey); // privateKey should be a valid CryptoKey
 * console.log('Key Hex:', keyHex);
 */
export async function keyToHex(key: CryptoKey): Promise<string> {
  let keyData: ArrayBuffer

  // Check the type of the key to determine how to handle it
  if (key.type === 'private') {
    // Convert private key to DER format
    keyData = await crypto.subtle.exportKey('pkcs8', key)
  } else if (key.type === 'public') {
    // Convert public key to DER format
    keyData = await crypto.subtle.exportKey('spki', key)
  } else {
    throw new Error('Unsupported key type')
  }

  // Convert the binary data to a hexadecimal string
  return Buffer.from(keyData).toString('hex')
}

/**
 * Compares two public keys to check if they match.
 *
 * This function exports the given CryptoKey objects to their raw SPKI format,
 * converts them to hexadecimal strings, and then compares these strings to
 * determine if the keys are identical.
 *
 * @param publicKey1 - The first public key as a CryptoKey object.
 * @param publicKey2 - The second public key as a CryptoKey object.
 * @returns A promise that resolves to `true` if the keys match, `false` otherwise.
 *
 * @example
 * const key1 = await crypto.subtle.generateKey(
 *   { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: { name: 'SHA-256' } },
 *   true,
 *   ['verify']
 * );
 * const key2 = await crypto.subtle.generateKey(
 *   { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: { name: 'SHA-256' } },
 *   true,
 *   ['verify']
 * );
 * const match = await doPublicKeysMatch(key1.publicKey, key2.publicKey);
 * console.log('Keys match:', match);
 */
export async function doPublicKeysMatch(
  publicKey1: CryptoKey,
  publicKey2: CryptoKey,
): Promise<boolean> {
  const publicKey1Raw = new Uint8Array(await crypto.subtle.exportKey('spki', publicKey1))
  const publicKey2Raw = new Uint8Array(await crypto.subtle.exportKey('spki', publicKey2))

  const publicKey1Hex = Array.from(new Uint8Array(publicKey1Raw))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  const publicKey2Hex = Array.from(publicKey2Raw)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return publicKey1Hex === publicKey2Hex
}

// ===========================================
//                  Utils
// ===========================================

/**
 * Validates if the derived public key matches the certificate's public key.
 *
 * This function exports the derived public key to its raw SPKI format, converts both
 * the certificate's public key and the derived public key to hexadecimal strings, and
 * compares these strings to determine if they are identical.
 *
 * @param {x509.PublicKey} certPublicKey - The public key extracted from the certificate.
 * @param {CryptoKey} derivedPublicKey - The derived public key to be validated.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the keys match, `false` otherwise.
 *
 * @example
 * const isValid = await validateCertificatePublicKey(certPublicKey, derivedPublicKey);
 * console.log('Keys match:', isValid);
 */
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
    keyData = Buffer.from(asn1.toDer(pemToASN1(pem)).toHex(), 'hex')
  } else if (pem.includes('BEGIN PUBLIC KEY')) {
    // Standard SPKI format
    keyData = buffer
  } else {
    throw new Error('Unsupported key format')
  }

  return '0x' + keyData.toString('hex')
}

enum KeyType {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

interface Algorithm {
  name: string
}
export type WebCryptoAlgorithmIdentifier = Algorithm | string

/**
 * Converts a PEM key (private or public key) to a CryptoKey format.
 * @param pem pem string
 * @returns private/public key in CryptoKey format
 */
export async function pemToCryptoKeyForSigning(
  pem: string,
  algorithm:
    | WebCryptoAlgorithmIdentifier
    | RsaHashedImportParams
    | EcKeyImportParams
    | HmacImportParams
    | AesKeyAlgorithm,
): Promise<CryptoKey> {
  const [keyType, base64Final] = pemToArrayBuffer(pem)

  let formatType: 'pkcs8' | 'spki' | 'raw'
  let keyUsages: Iterable<KeyUsage>
  if (keyType === KeyType.PRIVATE) {
    formatType = 'pkcs8'
    keyUsages = ['sign']
  } else if (keyType === KeyType.PUBLIC) {
    formatType = 'spki' // 'raw' for Ed25519
    keyUsages = ['verify']
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
 * Decrypts a PEM-encoded private key using the provided password.
 */
export function decryptPem(pem: string, password: string): string {
  try {
    const privateKeyInfo = pki.decryptPrivateKeyInfo(pemToASN1(pem), password)

    return pki.privateKeyInfoToPem(privateKeyInfo)
  } catch (error: any) {
    console.error('Failed to decrypt PEM:', error)
    throw new Error(`Failed to decrypt PEM: ${error.message}`)
  }
}

// Converts a PCKS8 formatted PEM key (private or public key) to a ASN-1.
export function pemToASN1(pem: string): asn1.Asn1 {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')

  return asn1.fromDer(util.decode64(base64))
}

// Converts a PCKS8 formatted PEM key (private or public key) to a byte-like array buffer.
export function plainPemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace(/-----BEGIN .*?-----/, '')
    .replace(/-----END .*?-----/, '')
    .replace(/\s/g, '')

  return base64ToArrayBuffer(base64)
}

// Encrypts a PCKS8 formatted PEM key (private key) using the provided password.
export function encryptPem(pem: string, password: string): string {
  return pki.privateKeyInfoToPem(pki.encryptPrivateKeyInfo(pemToASN1(pem), password))
}
