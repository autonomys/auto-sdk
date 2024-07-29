import { Crypto } from '@peculiar/webcrypto'
import { createPrivateKey, createPublicKey } from 'crypto'
import fs from 'fs'
const crypto = new Crypto()

export type SupportedAlgorithm = 'RSASSA-PKCS1-v1_5' | 'Ed25519'

function getAlgorithm(algorithm: SupportedAlgorithm): RsaHashedImportParams | Algorithm {
  switch (algorithm) {
    case 'RSASSA-PKCS1-v1_5':
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      }
    case 'Ed25519':
      return {
        name: 'Ed25519',
      }
    default:
      throw new Error('Unsupported algorithm')
  }
}

export async function pemToPrivateKey(
  pemData: string,
  algorithm: Algorithm | RsaHashedImportParams | EcKeyImportParams,
  password?: string,
): Promise<CryptoKey> {
  const keyObject = createPrivateKey({
    key: pemData,
    format: 'pem',
    passphrase: password,
  })

  const keyBuffer = keyObject.export({ type: 'pkcs8', format: 'der' })
  return crypto.subtle.importKey('pkcs8', keyBuffer, algorithm, true, ['sign'])
}

export async function pemToPublicKey(
  pemData: string,
  algorithm: Algorithm | RsaHashedImportParams | EcKeyImportParams,
): Promise<CryptoKey> {
  const keyObject = createPublicKey({
    key: pemData,
    format: 'pem',
  })

  const keyBuffer = keyObject.export({ type: 'spki', format: 'der' })
  return crypto.subtle.importKey('spki', keyBuffer, algorithm, true, ['verify'])
}

export async function pemToKeyPair(
  privatePemPath: string,
  publicPemPath: string,
  algorithm: SupportedAlgorithm,
): Promise<CryptoKeyPair> {
  // Read PEM files
  const privatePem = fs.readFileSync(privatePemPath, 'utf8')
  const publicPem = fs.readFileSync(publicPemPath, 'utf8')
  const algorithmDetails = getAlgorithm(algorithm)

  // Import private key
  const privateKey = await pemToPrivateKey(privatePem, algorithmDetails)

  // Import public key
  const publicKey = await pemToPublicKey(publicPem, algorithmDetails)

  return { privateKey, publicKey }
}
