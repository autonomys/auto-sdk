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
import * as fs from 'fs'
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
  const relevantPart = errorCode.slice(2, 4) // Gets the byte corresponding to the specific error

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
    case '0A':
      return AutoIdError.AutoIdIdentifierMismatch
    case '0B':
      return AutoIdError.PublicKeyMismatch
    default:
      return null // Or handle unknown error types differently
  }
}

// taken from auto-id pallet
interface AutoIdX509Certificate {
  issuerId: string
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

// CLEANUP: Remove debug logs
// x509 Certificate to DER format & tbsCertificate.
// Returns a tuple of two Uint8Array.
function x509CertificateToCertDerVec(certificate: X509Certificate): [Uint8Array, Uint8Array] {
  const certificateBuffer = Buffer.from(certificate.rawData)
  console.debug(`Certificate Buffer of len ${certificateBuffer.byteLength}:`)
  console.debug(certificateBuffer) // --> '.....autoid:auto:307866386536......'
  console.debug(`Certificate Buffer Hex: 0x${certificateBuffer.toString('hex')}`)

  // Load and parse the certificate
  const cert = AsnParser.parse(certificateBuffer, Certificate)
  // Extract the OID of the signature algorithm
  const signatureAlgorithmOID = cert.signatureAlgorithm.algorithm
  console.debug('Cert Signature Algorithm OID:', signatureAlgorithmOID) // --> 1.3.101.112

  const derEncodedOID = derEncodeSignatureAlgorithmOID(signatureAlgorithmOID)
  console.debug(`DER encoded OID: ${derEncodedOID}`) // --> 36,48,7,6,3,43,101,112,5,0
  // console.debug(`derEncodedOID Buffer: ${Buffer.from(derEncodedOID)}`)
  // console.debug(`Bytes length: ${derEncodedOID.length}`)

  // The TBS Certificate is accessible directly via the `tbsCertificate` property
  const tbsCertificate = cert.tbsCertificate

  // Serialize the TBS Certificate back to DER format
  const tbsCertificateDerVec = AsnSerializer.serialize(tbsCertificate)
  console.debug(`TBS Certificate DER Vec: ${new Uint8Array(tbsCertificateDerVec)}`) // --> 48,130,1,55,160,3,2,1,2,2,16,6,63,42,209,226,214,20,114,22,195,30,195,.......

  return [derEncodedOID, new Uint8Array(tbsCertificateDerVec)]
}

export class Registry {
  private api: ApiPromise
  private signer: KeyringPair | null

  constructor(rpcUrl: string = 'ws://127.0.0.1:9944', signer: KeyringPair | null = null) {
    this.api = new ApiPromise({ provider: new WsProvider(rpcUrl) })
    this.signer = signer
  }

  // register auto id
  async registerAutoId(
    certificate: X509Certificate,
    issuerId?: string | null | undefined,
  ): Promise<RegistrationResult> {
    await this.api.isReady

    if (!this.signer) {
      throw new Error('No signer provided')
    }

    // TODO: add check for certificate if it's already registered so as to avoid paying fees for invalid auto id registration
    // https://github.com/subspace/subspace/blob/ea685ddfdcb6b96122b9311d9137c3ab22176633/domains/pallets/auto-id/src/lib.rs#L468-L472

    const [derEncodedOID, tbsCertificateDerVec] = x509CertificateToCertDerVec(certificate)

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
  async revokeCertificate(autoIdIdentifier: string): Promise<SubmittableResult> {
    await this.api.isReady

    if (!this.signer) {
      throw new Error('No signer provided')
    }

    const certificateRevocationList =
      await this.api.query.autoId.certificateRevocationList(autoIdIdentifier)

    // ensure the revocation list is empty for the given auto id identifier
    if (!certificateRevocationList.isEmpty) {
      throw new Error('Auto ID Identifier found in Certificate Revocation List')
    }

    const certificate = await this.getCertificate(autoIdIdentifier)

    const subjectPublicKeyInfo = certificate.subjectPublicKeyInfo
    const algorithmOid = extractSignatureAlgorithmOID(subjectPublicKeyInfo)

    const isIssuer = certificate.issuerId === null ? true : false
    console.debug(`Is issuer: ${isIssuer}`)

    // Convert individual properties to Uint8Array for the signing data
    const idU8a = hexStringToU8a(autoIdIdentifier)
    const nonce = BigInt(certificate.nonce)
    const nonceU8a = bnToU8a(nonce, { bitLength: 256, isLe: false, isNegative: false }) // For BigInt
    const actionTypeU8a = new Uint8Array([CertificateActionType.RevokeCertificate])

    // Concatenate all Uint8Array
    const serializedData = u8aConcat(idU8a, nonceU8a, actionTypeU8a)

    console.debug('Data to Sign (Hex):', Buffer.from(serializedData).toString('hex'))

    // Sign the data and prepare it for blockchain submission
    const signature = await signPreimage(serializedData, isIssuer, algorithmOid)
    console.debug('Generated Signature (Hex):', Buffer.from(signature.value).toString('hex'))
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

  // Get certificate from auto id identifier.
  async getCertificate(autoIdIdentifier: string): Promise<AutoIdX509Certificate> {
    const certificate = await this.api.query.autoId.autoIds(autoIdIdentifier)
    const autoIdCertificateJson: AutoIdX509Certificate = JSON.parse(
      JSON.stringify(certificate.toHuman(), null, 2),
    ).certificate.X509

    return autoIdCertificateJson
  }

  // TODO: Get revocation list from auto id identifier.
}

interface Signature {
  signature_algorithm: Uint8Array // use Uint8Array to handle DER bytes
  value: Uint8Array
}

/** ===== Utils ===== */
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

function convertToWebCryptoAlgorithm(
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

/**
 * Sign the preimage using the signer's keypair.
 * NOTE: Ed25519 algorithm identifier is used. Change this for other key types.
 * @param data Data to be signed as Buffer | Uint8Array.
 * @param isIssuer Boolean flag to choose key type.
 * @returns A Promise that resolves to a Signature object.
 */
async function signPreimage(
  data: Uint8Array,
  isIssuer: boolean,
  algorithmId: AsnAlgorithmIdentifier,
): Promise<Signature> {
  const privateKeyPath = isIssuer ? './res/private.issuer.pem' : './res/private.leaf.pem'

  const privateKeyPEM = fs.readFileSync(privateKeyPath, 'utf8').replace(/\\n/gm, '\n')
  console.debug('privateKeyPEM: ', privateKeyPEM)

  // Convert the ASN.1 algorithm identifier to a WebCrypto algorithm
  const webCryptoAlgorithm = convertToWebCryptoAlgorithm(algorithmId)

  // Convert PEM to CryptoKey
  const privateKey: CryptoKey = await pemToCryptoKeyForSigning(privateKeyPEM, webCryptoAlgorithm)
  console.debug(`private key algorithm: ${privateKey.algorithm.name}`)

  console.debug('Algorithm OID:', algorithmId.algorithm)

  /* sign the data with the private key */
  const signature = await crypto.subtle.sign(webCryptoAlgorithm, privateKey, data)

  const derEncodedOID = derEncodeSignatureAlgorithmOID(algorithmId.algorithm)

  return {
    signature_algorithm: derEncodedOID,
    value: new Uint8Array(signature),
  }
}

// TODO: add this to class's methods
// deactivate auto id
// async deactivateAutoId(
//   autoIdIdentifier: string,
//   certificate: X509Certificate,
// ): Promise<SubmittableResult> {
//   await this.api.isReady

//   if (!this.signer) {
//     throw new Error('No signer provided')
//   }

//   const [derEncodedOID] = x509CertificateToCertDerVec(certificate)
//   const signature = {
//     signature_algorithm: derEncodedOID,
//     value: compactAddLength(new Uint8Array(certificate.signature)),
//   }

//   // TODO: verify signature before sending the transaction

//   const receipt: SubmittableResult = await new Promise((resolve, reject) => {
//     this.api.tx.autoId
//       .deactivateAutoId(autoIdIdentifier, signature)
//       .signAndSend(this.signer!, async (result) => {
//         const { events = [], status, dispatchError } = result

//         if (status.isInBlock || status.isFinalized) {
//           const blockHash = status.isInBlock
//             ? status.asInBlock.toString()
//             : status.asFinalized.toString()

//           try {
//             // Retrieve the block using the hash to get the block number
//             const signedBlock = await this.api.rpc.chain.getBlock(blockHash)
//             events.forEach(({ event: { section, method } }) => {
//               if (section === 'system' && method === 'ExtrinsicFailed') {
//                 const dispatchErrorJson = JSON.parse(dispatchError!.toString())

//                 reject(
//                   new Error(
//                     `Deactivate Auto ID | Extrinsic failed: ${mapErrorCodeToEnum(dispatchErrorJson.module.error)} in block #${signedBlock.block.header.number.toString()}`,
//                   ),
//                 )
//               }
//             })
//             resolve(result)
//           } catch (err: any) {
//             reject(new Error(`Failed to retrieve block information: ${err.message}`))
//           }
//         } else if (status.isDropped || status.isInvalid) {
//           reject(new Error('Transaction dropped or invalid'))
//         }
//       })
//   })

//   return receipt
// }
// }
