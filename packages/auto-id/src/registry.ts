import { AsnParser, AsnSerializer } from '@peculiar/asn1-schema'
import { Certificate } from '@peculiar/asn1-x509'
import { X509Certificate } from '@peculiar/x509'
import { ApiPromise, SubmittableResult, WsProvider } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import { compactAddLength } from '@polkadot/util'
import { derEncodeSignatureAlgorithmOID } from './utils'

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

interface RegistrationResult {
  receipt: SubmittableResult | null
  identifier: string | null
}

export class Registry {
  private api: ApiPromise
  private signer: KeyringPair | null

  constructor(rpcUrl: string = 'ws://127.0.0.1:9944', signer: KeyringPair | null = null) {
    this.api = new ApiPromise({ provider: new WsProvider(rpcUrl) })
    this.signer = signer
  }

  public async registerAutoId(
    certificate: X509Certificate,
    issuerId?: string | null | undefined,
  ): Promise<RegistrationResult> {
    await this.api.isReady

    if (!this.signer) {
      throw new Error('No signer provided')
    }

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

    const baseCertificate = {
      certificate: compactAddLength(new Uint8Array(tbsCertificateDerVec)),
      signature_algorithm: derEncodedOID,
      signature: compactAddLength(new Uint8Array(certificate.signature)),
    }

    const certificateParam = issuerId
      ? { Leaf: { issuer_id: issuerId, ...baseCertificate } }
      : { Root: baseCertificate }

    const req = { X509: certificateParam }

    let identifier: string | null = null

    const receipt: SubmittableResult = await new Promise((resolve, reject) => {
      this.api.tx.autoId.registerAutoId(req).signAndSend(this.signer!, (result) => {
        const { events = [], status } = result

        if (status.isInBlock || status.isFinalized) {
          events.forEach(({ event: { section, method, data } }) => {
            if (section === 'system' && method === 'ExtrinsicFailed') {
              // dispatchInfo contains the weight related data, txfee paid.
              const [dispatchError, dispatchInfo] = data
              const dispatchErrorJson = JSON.parse(dispatchError.toString())

              reject(
                new Error(
                  `Extrinsic failed: ${mapErrorCodeToEnum(dispatchErrorJson.module.error)}`,
                ),
              )
            }
            if (section === 'system' && method === 'ExtrinsicSuccess') {
              console.debug('Extrinsic succeeded')
            }
            if (section === 'autoId' && method === 'NewAutoIdRegistered') {
              identifier = data[0].toString()
            }
          })
          resolve(result)
        } else if (status.isDropped || status.isInvalid) {
          reject(new Error('Transaction dropped or invalid'))
        }
      })
    })

    return { receipt, identifier }
  }
}
