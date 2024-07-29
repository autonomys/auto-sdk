import { ApiPromise, blake2b_256 } from '@autonomys/auto-utils'
import { AsnConvert, OctetString } from '@peculiar/asn1-schema'
import { AlgorithmIdentifier as AsnAlgorithmIdentifier } from '@peculiar/asn1-x509'
import { X509Certificate } from '@peculiar/x509'
import { hexToU8a } from '@polkadot/util'
import { AutoIdX509Certificate, getSubjectCommonName } from './index'

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
