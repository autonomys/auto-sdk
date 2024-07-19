import { AsnParser, AsnSerializer } from '@peculiar/asn1-schema'
import { Certificate } from '@peculiar/asn1-x509'
import { X509Certificate } from '@peculiar/x509'
import { ApiPromise, SubmittableResult, WsProvider } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import { compactAddLength } from '@polkadot/util'
import {
  derEncodeSignatureAlgorithmOID,
  identifierFromX509Cert,
  mapErrorCodeToEnum,
  prepareSigningData,
  signAndSendTx,
  signData,
} from './utils'

// taken from auto-id pallet
export interface AutoIdX509Certificate {
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

export enum CertificateActionType {
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
export const convertX509CertToDerEncodedComponents = (
  certificate: X509Certificate,
): [Uint8Array, Uint8Array] => {
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

    const { receipt, identifier } = await signAndSendTx(
      this.api,
      this.api.tx.autoId.registerAutoId(req),
      this.signer,
      mapErrorCodeToEnum,
    )

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

    const { receipt } = await signAndSendTx(
      this.api,
      this.api.tx.autoId.revokeCertificate(autoIdIdentifier, signatureEncoded),
      this.signer,
      mapErrorCodeToEnum,
    )

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

    const { receipt } = await signAndSendTx(
      this.api,
      this.api.tx.autoId.deactivateAutoId(autoIdIdentifier, signatureEncoded),
      this.signer,
      mapErrorCodeToEnum,
    )

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

    const [derEncodedOID, tbsCertificateDerVec] =
      convertX509CertToDerEncodedComponents(newCertificate)

    const renewCertificate = {
      issuer_id: issuerId,
      certificate: compactAddLength(tbsCertificateDerVec),
      signature_algorithm: compactAddLength(derEncodedOID),
      signature: compactAddLength(new Uint8Array(newCertificate.signature)),
    }

    const req = { X509: renewCertificate }

    const { receipt, identifier } = await signAndSendTx(
      this.api,
      this.api.tx.autoId.renewAutoId(autoIdIdentifier, req),
      this.signer,
      mapErrorCodeToEnum,
    )

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
