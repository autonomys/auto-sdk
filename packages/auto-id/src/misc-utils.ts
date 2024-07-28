import { blake2b_256 } from '@autonomys/auto-utils'
import { AsnConvert, AsnParser, OctetString } from '@peculiar/asn1-schema'
import {
  AlgorithmIdentifier as AsnAlgorithmIdentifier,
  SubjectPublicKeyInfo,
} from '@peculiar/asn1-x509'
import { Crypto } from '@peculiar/webcrypto'
import { X509Certificate } from '@peculiar/x509'
import { ApiPromise } from '@polkadot/api'
import { bnToU8a, hexToU8a, u8aConcat } from '@polkadot/util'
import * as fs from 'fs'
import {
  AutoIdX509Certificate,
  CertificateActionType,
  WebCryptoAlgorithmIdentifier,
  getSubjectCommonName,
  pemToCryptoKeyForSigning,
} from './index'

/**
 * Encodes a given string representation of an OID into its DER format,
 * appropriately handling the parameters.
 *
 * @param oid The string representation of the ObjectIdentifier to be encoded.
 * @param parameters Optional parameters, null if no parameters.
 * @returns Uint8Array containing the DER-encoded OID with appended parameters.
 */
export const derEncodeSignatureAlgorithmOID = (
  oid: string,
  parameters: ArrayBuffer | null = null,
): Uint8Array => {
  // Create an instance of AlgorithmIdentifier with proper handling of parameters
  const algorithmIdentifier = new AsnAlgorithmIdentifier({
    algorithm: oid,
    parameters: parameters ? AsnConvert.serialize(new OctetString(parameters)) : null,
  })

  // Convert the entire AlgorithmIdentifier to DER
  const derEncoded = AsnConvert.serialize(algorithmIdentifier)

  // Return the resulting DER-encoded data
  return new Uint8Array(derEncoded)
}

export const addDaysToCurrentDate = (days: number): Date => {
  const currentDate = new Date() // This gives you the current date and time
  currentDate.setUTCDate(currentDate.getUTCDate() + days) // Adds the specified number of days
  return currentDate
}

// Errors from the auto-id pallet.
export enum AutoIdError {
  UnknownIssuer = 'UnknownIssuer',
  UnknownAutoId = 'UnknownAutoId',
  InvalidCertificate = 'InvalidCertificate',
  InvalidSignature = 'InvalidSignature',
  CertificateSerialAlreadyIssued = 'CertificateSerialAlreadyIssued',
  ExpiredCertificate = 'ExpiredCertificate',
  CertificateRevoked = 'CertificateRevoked',
  CertificateAlreadyRevoked = 'CertificateAlreadyRevoked',
  NonceOverflow = 'NonceOverflow',
  AutoIdIdentifierAlreadyExists = 'AutoIdIdentifierAlreadyExists',
  AutoIdIdentifierMismatch = 'AutoIdIdentifierMismatch',
  PublicKeyMismatch = 'PublicKeyMismatch',
}

/**
 * Maps an error code to the corresponding enum variant.
 * @param errorCode The error code as a hexadecimal string (e.g., "0x09000000").
 * @returns The corresponding enum variant or null if not found.
 */
export const mapErrorCodeToEnum = (errorCode: string): AutoIdError | null => {
  // Remove the '0x' prefix and extract the relevant part of the error code
  const relevantPart = errorCode.slice(2, 4).toLowerCase() // Gets the byte corresponding to the specific error

  switch (relevantPart) {
    case '00':
      return AutoIdError.UnknownIssuer
    case '01':
      return AutoIdError.UnknownAutoId
    case '02':
      return AutoIdError.InvalidCertificate
    case '03':
      return AutoIdError.InvalidSignature
    case '04':
      return AutoIdError.CertificateSerialAlreadyIssued
    case '05':
      return AutoIdError.ExpiredCertificate
    case '06':
      return AutoIdError.CertificateRevoked
    case '07':
      return AutoIdError.CertificateAlreadyRevoked
    case '08':
      return AutoIdError.NonceOverflow
    case '09':
      return AutoIdError.AutoIdIdentifierAlreadyExists
    case '0a':
      return AutoIdError.AutoIdIdentifierMismatch
    case '0b':
      return AutoIdError.PublicKeyMismatch
    default:
      return null // Or handle unknown error types differently
  }
}

export const identifierFromX509Cert = (
  issuerId: string | null | undefined,
  certificate: X509Certificate,
): string => {
  const subjectCommonName = getSubjectCommonName(certificate.subjectName)
  if (!subjectCommonName) {
    throw new Error('Subject Common Name not found')
  }

  // convert from string to bytes.
  const subjectCommonNameBytes = new TextEncoder().encode(subjectCommonName)

  if (issuerId) {
    const issuerIdBytes = new TextEncoder().encode(issuerId)
    const data = new Uint8Array(issuerIdBytes.length + subjectCommonNameBytes.length)
    data.set(issuerIdBytes)
    data.set(subjectCommonNameBytes, issuerIdBytes.length)

    return blake2b_256(data)
  } else {
    return blake2b_256(subjectCommonNameBytes)
  }
}

// Utility function to prepare signing data
export const prepareSigningData = async (
  api: ApiPromise,
  autoIdIdentifier: string,
  getCertificate: (id: string) => Promise<AutoIdX509Certificate | undefined>,
  actionType: CertificateActionType,
): Promise<{
  serializedData: Uint8Array
  algorithmIdentifier: AsnAlgorithmIdentifier
}> => {
  const certificate = await checkCertificateAndRevocationList(api, autoIdIdentifier, getCertificate)
  const subjectPublicKeyInfo = certificate.subjectPublicKeyInfo
  const publicKeyAlgorithmIdentifier = extractPublicKeyAlgorithmOID(subjectPublicKeyInfo)
  const isIssuer = certificate.issuerId === null

  const idU8a = hexStringToU8a(autoIdIdentifier)
  let nonceU8a: Uint8Array
  if (isIssuer) {
    nonceU8a = bnToU8a(BigInt(certificate.nonce), { bitLength: 256, isLe: false })
  } else {
    const issuerCertificate = await checkCertificateAndRevocationList(
      api,
      certificate.issuerId!,
      getCertificate,
    )
    nonceU8a = bnToU8a(BigInt(issuerCertificate.nonce), { bitLength: 256, isLe: false })
  }
  const actionTypeU8a = new Uint8Array([actionType])

  const serializedData = u8aConcat(idU8a, nonceU8a, actionTypeU8a)
  console.log('idU8a:', idU8a)
  console.log('nonceu8a:', nonceU8a)
  console.log('actionTypeU8a:', actionTypeU8a)
  console.log('serializedData:', serializedData)

  return { serializedData, algorithmIdentifier: publicKeyAlgorithmIdentifier }
}

// Utility function to handle common certificate checks
export const checkCertificateAndRevocationList = async (
  api: ApiPromise,
  autoIdIdentifier: string,
  getCertificate: (id: string) => Promise<AutoIdX509Certificate | undefined>,
): Promise<AutoIdX509Certificate> => {
  const certificate = await getCertificate(autoIdIdentifier)
  if (!certificate) {
    throw new Error('Certificate not found or already deactivated')
  }

  const certificateRevocationList =
    await api.query.autoId.certificateRevocationList(autoIdIdentifier)
  if (!certificateRevocationList.isEmpty) {
    throw new Error('Auto ID Identifier found in Certificate Revocation List. So, already revoked.')
  }

  return certificate
}

interface Signature {
  signature_algorithm: Uint8Array // use Uint8Array to handle DER bytes
  value: Uint8Array
}

// Converts a hex string to a Uint8Array
export const hexStringToU8a = (hexString: string): Uint8Array => {
  return hexToU8a(hexString.startsWith('0x') ? hexString : `0x${hexString}`)
}

/**
 * Extracts the public key algorithm OID from the subjectPublicKeyInfo of an X.509 certificate.
 * @param subjectPublicKeyInfo hex string format
 * @returns algorithm identifier
 */
export const extractPublicKeyAlgorithmOID = (
  subjectPublicKeyInfo: string,
): AsnAlgorithmIdentifier => {
  const publicKeyInfoHex = subjectPublicKeyInfo.startsWith('0x')
    ? subjectPublicKeyInfo.slice(2)
    : subjectPublicKeyInfo
  const publicKeyInfoBuffer: Buffer | Uint8Array = Buffer.from(publicKeyInfoHex, 'hex')

  // Parse the subjectPublicKeyInfo using ASN1 Parser
  const publicKeyInfo = AsnParser.parse(publicKeyInfoBuffer, SubjectPublicKeyInfo)

  return publicKeyInfo.algorithm
}

export const publicKeyAlgorithmToSignatureAlgorithm = (
  publicKeyAlgorithmOID: string,
): AsnAlgorithmIdentifier => {
  switch (publicKeyAlgorithmOID) {
    case '1.3.101.112': // Public key Algorithm OID for Ed25519
      return new AsnAlgorithmIdentifier({
        algorithm: '1.3.101.112', // Certificate Signature Algorithm OID for Ed25519
        parameters: null,
      })
    case '1.2.840.113549.1.1.1': // Public key Algorithm OID for RSASSA-PKCS1-v1_5
      return new AsnAlgorithmIdentifier({
        algorithm: '1.2.840.113549.1.1.11',
        parameters: null,
      })
    default:
      throw new Error('Unsupported public key algorithm OID: ' + publicKeyAlgorithmOID)
  }
}

// Convert the Certificate signature algorithm identifier to a WebCrypto algorithm
export const convertToWebCryptoAlgorithm = (
  asnAlgId: AsnAlgorithmIdentifier,
):
  | WebCryptoAlgorithmIdentifier
  | RsaHashedImportParams
  | EcKeyImportParams
  | HmacImportParams
  | AesKeyAlgorithm => {
  // TODO: Use some library to avoid manual mapping
  switch (asnAlgId.algorithm) {
    case '1.2.840.113549.1.1.11': // OID for sha256WithRSAEncryption
    case '1.2.840.113549.1.1.1': // OID for RSAES-PKCS1-v1_5
      return {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' },
      }
    case '1.3.101.112': // OID for Ed25519
      return { name: 'Ed25519' }
    default:
      throw new Error('Unsupported algorithm OID: ' + asnAlgId.algorithm)
  }
}

const crypto = new Crypto()

// Utility function to sign data
export const signData = async (
  data: Uint8Array,
  certSigAlgorithmId: AsnAlgorithmIdentifier,
  filePath: string,
): Promise<Signature> => {
  const privateKeyPEM = fs.readFileSync(filePath, 'utf8').replace(/\\n/gm, '\n')
  const webCryptoAlgorithm = convertToWebCryptoAlgorithm(certSigAlgorithmId)
  const privateKey: CryptoKey = await pemToCryptoKeyForSigning(privateKeyPEM, webCryptoAlgorithm)
  const signature = await crypto.subtle.sign(privateKey.algorithm, privateKey, data)

  const derEncodedOID = derEncodeSignatureAlgorithmOID(certSigAlgorithmId.algorithm)

  return {
    signature_algorithm: derEncodedOID,
    value: new Uint8Array(signature),
  }
}

export const hexToPemPublicKey = (hexString: string): string => {
  // Convert hex string to Buffer
  const buffer = hexString.startsWith('0x')
    ? Buffer.from(hexString.slice(2), 'hex')
    : Buffer.from(hexString, 'hex')

  // Convert to base64
  const base64Key = buffer.toString('base64')

  // Format as PEM
  const pemKey = `-----BEGIN PUBLIC KEY-----\n${base64Key.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`

  return pemKey
}
