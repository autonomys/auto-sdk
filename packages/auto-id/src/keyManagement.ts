import { read, save } from '@autonomys/auto-utils'
import { KeyObject, createPrivateKey, createPublicKey, generateKeyPairSync } from 'crypto'

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

import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
const crypto = new Crypto()

// FIXME: keep one function. need to modify the tests.
export async function generateEd25519KeyPair2(): Promise<[CryptoKey, CryptoKey]> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    },
    true,
    ['sign', 'verify'],
  )

  return [keyPair.privateKey, keyPair.publicKey]
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

// TODO: finalize which function is to keep (from node's crypto or webcrypto)
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
