import { AsnParser, AsnSerializer } from '@peculiar/asn1-schema'
import { Certificate } from '@peculiar/asn1-x509'
import { Crypto } from '@peculiar/webcrypto'
import { X509Certificate } from '@peculiar/x509'
import { ApiPromise, SubmittableResult, WsProvider } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import { bnToU8a, compactAddLength, stringToU8a, u8aConcat } from '@polkadot/util'
import * as fs from 'fs'
import { derEncodeSignatureAlgorithmOID } from './utils'

// Errors copied from the auto-id pallet.
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

enum CertificateActionType {
  RevokeCertificate,
  DeactivateAutoId,
}

interface RegistrationResult {
  receipt: SubmittableResult | null
  identifier: string | null
}

// x509 Certificate to DER format & tbsCertificate.
// Returns a tuple of two Uint8Array.
function x509CertificateToCertDerVec(certificate: X509Certificate): [Uint8Array, Uint8Array] {
  const certificateBuffer = Buffer.from(certificate.rawData)

  // Load and parse the certificate
  const cert = AsnParser.parse(certificateBuffer, Certificate)
  // Extract the OID of the signature algorithm
  const signatureAlgorithmOID = cert.signatureAlgorithm.algorithm

  const derEncodedOID = derEncodeSignatureAlgorithmOID(signatureAlgorithmOID)
  // CLEANUP: Remove later. Kept for debugging for other modules.
  // console.debug(Buffer.from(derEncodedOID))
  // console.debug(`DER encoded OID: ${derEncodedOID}`)
  // console.debug(`Bytes length: ${derEncodedOID.length}`)

  // The TBS Certificate is accessible directly via the `tbsCertificate` property
  const tbsCertificate = cert.tbsCertificate

  // Serialize the TBS Certificate back to DER format
  const tbsCertificateDerVec = AsnSerializer.serialize(tbsCertificate)

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
      signature_algorithm: derEncodedOID,
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

    const autoIdCertificate = await this.api.query.autoId.autoIds(autoIdIdentifier)
    const autoIdCertificateJson = JSON.parse(JSON.stringify(autoIdCertificate.toHuman(), null, 2))
      .certificate.X509

    const isIssuer = autoIdCertificateJson.issuerId === null ? true : false
    console.debug(`Is issuer: ${isIssuer}`)

    // M-1: Create the signing data
    // const signingData = {
    //   id: autoIdIdentifier,
    //   nonce: nonce,
    //   action_type: CertificateActionType.RevokeCertificate,
    // }

    // M-2: Convert individual properties to Uint8Array
    const nonce = BigInt(autoIdCertificateJson.nonce)
    const idU8a = stringToU8a(autoIdIdentifier)
    const nonceU8a = bnToU8a(nonce, { bitLength: 256, isLe: false, isNegative: false }) // For BigInt
    const actionTypeU8a = new Uint8Array([CertificateActionType.RevokeCertificate])

    // Concatenate all Uint8Array
    const serializedData = u8aConcat(idU8a, nonceU8a, actionTypeU8a)

    console.debug('Data to Sign (Hex):', Buffer.from(serializedData).toString('hex'))
    // Sign the data and prepare it for blockchain submission
    const signature = await signPreimage(serializedData, isIssuer)
    console.debug('Generated Signature (Hex):', Buffer.from(signature.value).toString('hex'))
    const signatureEncoded = {
      signature_algorithm: compactAddLength(signature.signature_algorithm), // Ed25519 does not use this
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
}

interface Signature {
  signature_algorithm: Uint8Array // use Uint8Array to handle DER bytes
  value: Uint8Array
}

const crypto = new Crypto()

export async function pemToCryptoKeyEd25519(pem: string): Promise<CryptoKey> {
  const pemHeader = '-----BEGIN PRIVATE KEY-----'
  const pemFooter = '-----END PRIVATE KEY-----'
  const pemContents = pem.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '')

  const binaryDer = Buffer.from(pemContents, 'base64')

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    // NOTE: change the algorithm identifier {name, hash} for the respective keypair's private key.
    {
      name: 'Ed25519',
    },
    true,
    ['sign'], // NOTE: Appropriate usage here for an Ed25519 private key
  )
}

/**
 * Sign the preimage using the signer's keypair.
 * NOTE: Ed25519 algorithm identifier is used. Change this for other key types.
 * @param data Data to be signed as Uint8Array.
 * @param isIssuer Boolean flag to choose key type.
 * @returns A Promise that resolves to a Signature object.
 */
async function signPreimage(data: Uint8Array, isIssuer: boolean): Promise<Signature> {
  // Load the private key from a file
  const privateKeyPath = isIssuer ? './res/private.issuer.pem' : './res/private.leaf.pem'
  const privateKeyPEMRaw = fs.readFileSync(privateKeyPath, 'utf8')
  const privateKeyPEM = privateKeyPEMRaw.replace(/\\n/gm, '\n') // remove the ending \n

  // Convert PEM to CryptoKey
  const privateKey: CryptoKey = await pemToCryptoKeyEd25519(privateKeyPEM)

  // sign the data with the private key
  const signature = await crypto.subtle.sign({ name: privateKey.algorithm.name }, privateKey, data)

  // Specify the algorithm identifier for RSA PKCS1 SHA256
  let oid = ''
  if (privateKey.algorithm.name === 'Ed25519') {
    oid = '1.3.101.112' // OID for Ed25519
  } else if (privateKey.algorithm.name === 'sha256WithRSAEncryption') {
    oid = '1.2.840.113549.1.1.11' // OID for RSA PKCS1 SHA256
  }
  console.debug('OID:', oid)

  const derEncodedOID = derEncodeSignatureAlgorithmOID(oid)

  return {
    signature_algorithm: derEncodedOID, // NOTE: Ed25519 does not use OIDs
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
