import { blake2b_256 } from '@autonomys/auto-utils'
import { AsnParser, AsnSerializer } from '@peculiar/asn1-schema'
import {
  AlgorithmIdentifier as AsnAlgorithmIdentifier,
  Certificate,
  SubjectPublicKeyInfo,
} from '@peculiar/asn1-x509'
import { Crypto } from '@peculiar/webcrypto'
import { X509Certificate } from '@peculiar/x509'
import { ApiPromise, SubmittableResult, WsProvider } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import { bnToU8a, compactAddLength, hexToU8a, u8aConcat } from '@polkadot/util'
import { strict as assert } from 'assert'
import * as fs from 'fs'
import { CertificateManager } from './certificateManager'
import { pemToCryptoKeyForSigning } from './keyManagement'
import { derEncodeSignatureAlgorithmOID } from './utils'

const crypto = new Crypto()

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
function mapErrorCodeToEnum(errorCode: string): AutoIdError | null {
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

// taken from auto-id pallet
interface AutoIdX509Certificate {
  issuerId: string | null
  serial: string
  subjectCommonName: string
  subjectPublicKeyInfo: string
  validity: {
    notBefore: number
    notAfter: number
  }
  raw: string
  issuedSerials: string[]
  nonce: number
}

enum CertificateActionType {
  RevokeCertificate,
  DeactivateAutoId,
}

interface RegistrationResult {
  receipt: SubmittableResult | null
  identifier: string | null
}

// CLEANUP: Remove debug logs from this file once all the functionalities are tested.

// x509 Certificate to DER format & tbsCertificate.
// Returns a tuple of two Uint8Array.
function convertX509CertToDerEncodedComponents(
  certificate: X509Certificate,
): [Uint8Array, Uint8Array] {
  const certificateBuffer = Buffer.from(certificate.rawData)
  // console.debug(`Certificate Buffer of len ${certificateBuffer.byteLength}:`)
  // console.debug(certificateBuffer) // --> '.....autoid:auto:307866386536......'
  // console.debug(`Certificate Buffer Hex: 0x${certificateBuffer.toString('hex')}`)

  // Load and parse the certificate
  const cert = AsnParser.parse(certificateBuffer, Certificate)
  // Extract the OID of the signature algorithm
  const signatureAlgorithmOID = cert.signatureAlgorithm.algorithm
  // console.debug('Cert Signature Algorithm OID:', signatureAlgorithmOID) // --> 1.3.101.112

  const derEncodedOID = derEncodeSignatureAlgorithmOID(signatureAlgorithmOID)
  // console.debug(`DER encoded OID: ${derEncodedOID}`) // --> 36,48,7,6,3,43,101,112,5,0
  // console.debug(`derEncodedOID Buffer: ${Buffer.from(derEncodedOID)}`)
  // console.debug(`Bytes length: ${derEncodedOID.length}`)

  const tbsCertificate = cert.tbsCertificate

  // Serialize the TBS Certificate back to DER format
  const tbsCertificateDerVec = new Uint8Array(AsnSerializer.serialize(tbsCertificate))
  // console.debug('TBS Certificate DER Vec:', ${tbsCertificateDerVec}) // --> 48,130,1,55,160,3,2,1,2,2,16,6,63,42,209,226,214,20,114,22,195,30,195,.......

  return [derEncodedOID, tbsCertificateDerVec]
}

export class Registry {
  private api: ApiPromise
  private signer: KeyringPair | null

  constructor(rpcUrl: string = 'ws://127.0.0.1:9944', signer: KeyringPair | null = null) {
    this.api = new ApiPromise({ provider: new WsProvider(rpcUrl) })
    this.signer = signer
  }

  // ============================
  // Setters
  // ============================

  // register auto id
  async registerAutoId(
    certificate: X509Certificate,
    issuerId?: string | null | undefined,
  ): Promise<RegistrationResult> {
    await this.api.isReady

    if (!this.signer) {
      throw new Error('No signer provided')
    }

    // Add check for certificate if it's already registered so as to avoid paying fees for invalid auto id registration.
    const certIdentifier = identifierFromX509Cert(issuerId, certificate)
    const registeredCert = await this.getCertificate(certIdentifier)
    if (registeredCert) {
      throw new Error('Certificate already registered')
    }

    const [derEncodedOID, tbsCertificateDerVec] = convertX509CertToDerEncodedComponents(certificate)

    const baseCertificate = {
      certificate: compactAddLength(tbsCertificateDerVec),
      signature_algorithm: compactAddLength(derEncodedOID),
      signature: compactAddLength(new Uint8Array(certificate.signature)),
    }

    const certificateParam = issuerId
      ? { Leaf: { issuer_id: issuerId, ...baseCertificate } }
      : { Root: baseCertificate }

    const req = { X509: certificateParam }

    let identifier: string | null = null

    const receipt: SubmittableResult = await new Promise((resolve, reject) => {
      this.api.tx.autoId.registerAutoId(req).signAndSend(this.signer!, async (result) => {
        const { events = [], status, dispatchError } = result

        if (status.isInBlock || status.isFinalized) {
          const blockHash = status.isInBlock
            ? status.asInBlock.toString()
            : status.asFinalized.toString()

          try {
            // Retrieve the block using the hash to get the block number
            const signedBlock = await this.api.rpc.chain.getBlock(blockHash)
            events.forEach(({ event: { section, method, data } }) => {
              if (section === 'system' && method === 'ExtrinsicFailed') {
                const dispatchErrorJson = JSON.parse(dispatchError!.toString())

                reject(
                  new Error(
                    `Register Auto ID | Extrinsic failed: ${mapErrorCodeToEnum(dispatchErrorJson.module.error)} in block #${signedBlock.block.header.number.toString()}`,
                  ),
                )
              }
              if (section === 'autoId' && method === 'NewAutoIdRegistered') {
                identifier = data[0].toString()
              }
            })
            resolve(result)
          } catch (err: any) {
            reject(new Error(`Failed to retrieve block information: ${err.message}`))
          }
        } else if (status.isDropped || status.isInvalid) {
          reject(new Error('Transaction dropped or invalid'))
        }
      })
    })

    return { receipt, identifier }
  }

  // revoke certificate
  async revokeCertificate(autoIdIdentifier: string, filePath: string): Promise<SubmittableResult> {
    await this.api.isReady

    if (!this.signer) {
      throw new Error('No signer provided')
    }

    const { serializedData, algorithmOid } = await prepareSigningData(
      this.api,
      autoIdIdentifier,
      this.getCertificate.bind(this),
      CertificateActionType.RevokeCertificate,
    )

    const signature = await signData(serializedData, algorithmOid, filePath)
    const signatureEncoded = {
      signature_algorithm: compactAddLength(signature.signature_algorithm),
      value: compactAddLength(signature.value),
    }

    const receipt: SubmittableResult = await new Promise((resolve, reject) => {
      this.api.tx.autoId
        .revokeCertificate(autoIdIdentifier, signatureEncoded)
        .signAndSend(this.signer!, async (result) => {
          const { events = [], status, dispatchError } = result

          if (status.isInBlock || status.isFinalized) {
            const blockHash = status.isInBlock
              ? status.asInBlock.toString()
              : status.asFinalized.toString()

            try {
              // Retrieve the block using the hash to get the block number
              const signedBlock = await this.api.rpc.chain.getBlock(blockHash)
              events.forEach(({ event: { section, method } }) => {
                if (section === 'system' && method === 'ExtrinsicFailed') {
                  const dispatchErrorJson = JSON.parse(dispatchError!.toString())

                  reject(
                    new Error(
                      `Revoke Certificate | Extrinsic failed: ${mapErrorCodeToEnum(dispatchErrorJson.module.error)} in block #${signedBlock.block.header.number.toString()}`,
                    ),
                  )
                }
              })
              resolve(result)
            } catch (err: any) {
              reject(new Error(`Failed to retrieve block information: ${err.message}`))
            }
          } else if (status.isDropped || status.isInvalid) {
            reject(new Error('Transaction dropped or invalid'))
          }
        })
    })

    return receipt
  }

  // deactivate auto id
  // NOTE: Deactivation not possible for auto id whose certificate is already revoked.
  async deactivateAutoId(autoIdIdentifier: string, filePath: string): Promise<SubmittableResult> {
    await this.api.isReady

    if (!this.signer) {
      throw new Error('No signer provided')
    }

    const { serializedData, algorithmOid } = await prepareSigningData(
      this.api,
      autoIdIdentifier,
      this.getCertificate.bind(this),
      CertificateActionType.DeactivateAutoId,
    )

    // Sign the data and prepare it for blockchain submission
    const signature = await signData(serializedData, algorithmOid, filePath)
    const signatureEncoded = {
      signature_algorithm: compactAddLength(signature.signature_algorithm),
      value: compactAddLength(signature.value),
    }

    const receipt: SubmittableResult = await new Promise((resolve, reject) => {
      this.api.tx.autoId
        .deactivateAutoId(autoIdIdentifier, signatureEncoded)
        .signAndSend(this.signer!, async (result) => {
          const { events = [], status, dispatchError } = result

          if (status.isInBlock || status.isFinalized) {
            const blockHash = status.isInBlock
              ? status.asInBlock.toString()
              : status.asFinalized.toString()

            try {
              // Retrieve the block using the hash to get the block number
              const signedBlock = await this.api.rpc.chain.getBlock(blockHash)
              events.forEach(({ event: { section, method } }) => {
                if (section === 'system' && method === 'ExtrinsicFailed') {
                  const dispatchErrorJson = JSON.parse(dispatchError!.toString())

                  reject(
                    new Error(
                      `Deactivate Auto ID | Extrinsic failed: ${mapErrorCodeToEnum(dispatchErrorJson.module.error)} in block #${signedBlock.block.header.number.toString()}`,
                    ),
                  )
                }
              })
              resolve(result)
            } catch (err: any) {
              reject(new Error(`Failed to retrieve block information: ${err.message}`))
            }
          } else if (status.isDropped || status.isInvalid) {
            reject(new Error('Transaction dropped or invalid'))
          }
        })
    })

    return receipt
  }

  // renew auto id
  async renewAutoId(
    autoIdIdentifier: string,
    newCertificate: X509Certificate,
  ): Promise<RegistrationResult> {
    await this.api.isReady

    if (!this.signer) {
      throw new Error('No signer provided')
    }

    const oldCertificate = await this.getCertificate(autoIdIdentifier)
    if (!oldCertificate) {
      throw new Error('Certificate not found or already deactivated')
    }

    const issuerId = oldCertificate.issuerId

    // FIXME: Fails in case of renewal of leaf certificates. So, commented for now. Example file: "renew-leaf.ts".
    // Assert the identifiers of both `fetchedCertificate` and `certificate`
    // assert(identifierFromX509Cert(issuerId, newCertificate) === autoIdIdentifier)

    const [derEncodedOID, tbsCertificateDerVec] =
      convertX509CertToDerEncodedComponents(newCertificate)

    const renewCertificate = {
      issuer_id: issuerId,
      certificate: compactAddLength(tbsCertificateDerVec),
      signature_algorithm: compactAddLength(derEncodedOID),
      signature: compactAddLength(new Uint8Array(newCertificate.signature)),
    }

    const req = { X509: renewCertificate }

    let identifier: string | null = null

    const receipt: SubmittableResult = await new Promise((resolve, reject) => {
      this.api.tx.autoId
        .renewAutoId(autoIdIdentifier, req)
        .signAndSend(this.signer!, async (result) => {
          const { events = [], status, dispatchError } = result

          if (status.isInBlock || status.isFinalized) {
            const blockHash = status.isInBlock
              ? status.asInBlock.toString()
              : status.asFinalized.toString()

            try {
              // Retrieve the block using the hash to get the block number
              const signedBlock = await this.api.rpc.chain.getBlock(blockHash)
              events.forEach(({ event: { section, method, data } }) => {
                if (section === 'system' && method === 'ExtrinsicFailed') {
                  const dispatchErrorJson = JSON.parse(dispatchError!.toString())

                  reject(
                    new Error(
                      `Renew Auto ID | Extrinsic failed: ${mapErrorCodeToEnum(dispatchErrorJson.module.error)} in block #${signedBlock.block.header.number.toString()}`,
                    ),
                  )
                }
                if (section === 'autoId' && method === 'AutoIdRenewed') {
                  identifier = data[0].toString()
                }
              })
              resolve(result)
            } catch (err: any) {
              reject(new Error(`Failed to retrieve block information: ${err.message}`))
            }
          } else if (status.isDropped || status.isInvalid) {
            reject(new Error('Transaction dropped or invalid'))
          }
        })
    })

    return { receipt, identifier }
  }

  // ============================
  // Getters
  // ============================

  // Get certificate from auto id identifier.
  async getCertificate(autoIdIdentifier: string): Promise<AutoIdX509Certificate | null> {
    await this.api.isReady

    const certificate = await this.api.query.autoId.autoIds(autoIdIdentifier)
    if (certificate.isEmpty) {
      return null
    }

    const autoIdCertificateJson: AutoIdX509Certificate = JSON.parse(
      JSON.stringify(certificate.toHuman(), null, 2),
    ).certificate.X509

    return autoIdCertificateJson
  }

  // Get revocation list from auto id identifier.
  async getCertificateRevocationList(autoIdIdentifier: string): Promise<string[]> {
    await this.api.isReady

    const certificate = await this.getCertificate(autoIdIdentifier)
    if (!certificate) {
      throw new Error('Certificate not found or already deactivated')
    }

    // Fetch the revocation list for the given identifier
    const revokedCertificatesCodec =
      certificate.issuerId == null
        ? await this.api.query.autoId.certificateRevocationList(autoIdIdentifier)
        : await this.api.query.autoId.certificateRevocationList(certificate.issuerId)
    // Decode the Codec to get the actual BTreeSet
    const revokedCertificates = revokedCertificatesCodec.toJSON() as string[]
    // Check if revokedCertificates is iterable
    if (!revokedCertificates || typeof revokedCertificates[Symbol.iterator] !== 'function') {
      throw new Error('No revoked certificates found for this identifier.')
    }

    // Convert the BTreeSet to an array
    const revokedCertificatesArray = Array.from(revokedCertificates)
    return revokedCertificatesArray
  }
}

// ============================
// Utils
// ============================

export function identifierFromX509Cert(
  issuerId: string | null | undefined,
  certificate: X509Certificate,
): string {
  const subjectCommonName = CertificateManager.getSubjectCommonName(certificate.subjectName)
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
async function prepareSigningData(
  api: ApiPromise,
  autoIdIdentifier: string,
  getCertificate: (id: string) => Promise<AutoIdX509Certificate | null>,
  actionType: CertificateActionType,
): Promise<{
  serializedData: Uint8Array
  algorithmOid: AsnAlgorithmIdentifier
}> {
  const certificate = await checkCertificateAndRevocationList(api, autoIdIdentifier, getCertificate)
  const subjectPublicKeyInfo = certificate.subjectPublicKeyInfo
  const algorithmOid = extractSignatureAlgorithmOID(subjectPublicKeyInfo)
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

  return { serializedData, algorithmOid }
}

// Utility function to handle common certificate checks
export async function checkCertificateAndRevocationList(
  api: ApiPromise,
  autoIdIdentifier: string,
  getCertificate: (id: string) => Promise<AutoIdX509Certificate | null>,
): Promise<AutoIdX509Certificate> {
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
function hexStringToU8a(hexString: string): Uint8Array {
  return hexToU8a(hexString.startsWith('0x') ? hexString : `0x${hexString}`)
}

/**
 * Extracts the OID of the signature algorithm from the subjectPublicKeyInfo of an X.509 certificate.
 * @param subjectPublicKeyInfo hex string format
 * @returns algorithm identifier
 */
export function extractSignatureAlgorithmOID(subjectPublicKeyInfo: string): AsnAlgorithmIdentifier {
  const publicKeyInfoHex = subjectPublicKeyInfo.startsWith('0x')
    ? subjectPublicKeyInfo.slice(2)
    : subjectPublicKeyInfo
  const publicKeyInfoBuffer: Buffer | Uint8Array = Buffer.from(publicKeyInfoHex, 'hex')

  // Parse the subjectPublicKeyInfo using ASN1 Parser
  const publicKeyInfo = AsnParser.parse(publicKeyInfoBuffer, SubjectPublicKeyInfo)

  return publicKeyInfo.algorithm
}

// Convert the ASN.1 algorithm identifier to a WebCrypto algorithm
export function convertToWebCryptoAlgorithm(
  asnAlgId: AsnAlgorithmIdentifier,
):
  | AlgorithmIdentifier
  | RsaHashedImportParams
  | EcKeyImportParams
  | HmacImportParams
  | AesKeyAlgorithm {
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

// Utility function to sign data
async function signData(
  data: Uint8Array,
  algorithmId: AsnAlgorithmIdentifier,
  filePath: string,
): Promise<Signature> {
  const privateKeyPEM = fs.readFileSync(filePath, 'utf8').replace(/\\n/gm, '\n')
  // console.debug('privateKeyPEM: ', privateKeyPEM)
  const webCryptoAlgorithm = convertToWebCryptoAlgorithm(algorithmId)
  const privateKey: CryptoKey = await pemToCryptoKeyForSigning(privateKeyPEM, webCryptoAlgorithm)
  // console.debug(`private key algorithm: ${privateKey.algorithm.name}`)
  // console.debug('Algorithm OID:', algorithmId.algorithm)
  const signature = await crypto.subtle.sign(webCryptoAlgorithm, privateKey, data)
  const derEncodedOID = derEncodeSignatureAlgorithmOID(algorithmId.algorithm)

  return {
    signature_algorithm: derEncodedOID,
    value: new Uint8Array(signature),
  }
}

export function hexToPemPublicKey(hexString: string): string {
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
