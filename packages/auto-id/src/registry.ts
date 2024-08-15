import { ApiPromise, ISubmittableResult, SubmittableExtrinsic } from '@autonomys/auto-utils'
import { AsnParser, AsnSerializer } from '@peculiar/asn1-schema'
import { Certificate } from '@peculiar/asn1-x509'
import { X509Certificate } from '@peculiar/x509'
import { compactAddLength } from '@polkadot/util'
import { derEncodeSignatureAlgorithmOID } from './misc-utils'
import { AutoIdX509Certificate, Signature } from './types'
import { rawToPublicKey } from '.'

/*
  This function is used to get the certificate from the blockchain.

  @param api - The Auto-ID (@polkadot/api) API
  @param autoIdIdentifier - The Auto-ID identifier
  @returns The certificate as an AutoIdX509Certificate object
*/
export const getCertificate = async (
  api: ApiPromise,
  autoIdIdentifier: string,
): Promise<AutoIdX509Certificate | undefined> => {
  const certificate = await api.query.autoId.autoIds(autoIdIdentifier)
  if (certificate.isEmpty) {
    return undefined
  }

  const autoIdCertificateJson: AutoIdX509Certificate = JSON.parse(
    JSON.stringify(certificate.toHuman(), null, 2),
  ).certificate.X509

  return autoIdCertificateJson
}

/*
  This function is used to get the public key from the certificate.

  @param api - The Auto-ID (@polkadot/api) API
  @param autoIdIdentifier - The Auto-ID identifier
  @returns The public key as a CryptoKey object
*/
export const getCertificateSubjectPublicKey = async (
  api: ApiPromise,
  autoIdIdentifier: string,
): Promise<CryptoKey> => {
  const certificate = await getCertificate(api, autoIdIdentifier)
  if (!certificate) {
    throw new Error('Certificate not found or already deactivated')
  }
  const publicKey = Buffer.from(certificate.subjectPublicKeyInfo, 'hex')

  return rawToPublicKey(publicKey, {
    name: 'RSASSA-PKCS1-v1_5',
    hash: { name: 'SHA-256' },
  })
}

/*
  This function is used to get the certificate revocation list from the blockchain.

  @param api - The Auto-ID (@polkadot/api) API
  @param autoIdIdentifier - The Auto-ID identifier
  @returns The certificate revocation list as a string array
*/
export const getCertificateRevocationList = async (
  api: ApiPromise,
  autoIdIdentifier: string,
): Promise<string[]> => {
  const certificate = await getCertificate(api, autoIdIdentifier)
  if (!certificate) {
    throw new Error('Certificate not found or already deactivated')
  }

  const revokedCertificatesCodec =
    certificate.issuerId == null
      ? await api.query.autoId.certificateRevocationList(autoIdIdentifier)
      : await api.query.autoId.certificateRevocationList(certificate.issuerId)

  const revokedCertificates = revokedCertificatesCodec.toJSON() as string[]
  if (!revokedCertificates || typeof revokedCertificates[Symbol.iterator] !== 'function') {
    throw new Error('No revoked certificates found for this identifier.')
  }

  return Array.from(revokedCertificates)
}

/*
  This function is used to convert the X.509 certificate to DER encoded components.

  @param certificate - The X.509 certificate
  @returns The DER encoded OID and the DER encoded TBS certificate
*/
export const convertX509CertToDerEncodedComponents = (
  certificate: X509Certificate,
): [Uint8Array, Uint8Array] => {
  const certificateBuffer = Buffer.from(certificate.rawData)
  const cert = AsnParser.parse(certificateBuffer, Certificate)
  const signatureAlgorithmOID = cert.signatureAlgorithm.algorithm
  const derEncodedOID = derEncodeSignatureAlgorithmOID(signatureAlgorithmOID)
  const tbsCertificate = cert.tbsCertificate
  const tbsCertificateDerVec = new Uint8Array(AsnSerializer.serialize(tbsCertificate))
  return [derEncodedOID, tbsCertificateDerVec]
}

/*
  This function is used to register the Auto-ID with the X.509 certificate.

  @param api - The Auto-ID (@polkadot/api) API
  @param certificate - The X.509 certificate
  @param issuerId - The issuer ID
  @returns The SubmittableExtrinsic object
*/
export const registerAutoId = (
  api: ApiPromise,
  certificate: X509Certificate,
  issuerId?: string,
): SubmittableExtrinsic<'promise', ISubmittableResult> => {
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

  return api.tx.autoId.registerAutoId(req)
}

/*
  This function is used to revoke the certificate.

  @param api - The Auto-ID (@polkadot/api) API
  @param autoIdIdentifier - The Auto-ID identifier
  @param signature - The signature
  @returns The SubmittableExtrinsic object
*/
export const revokeCertificate = async (
  api: ApiPromise,
  autoIdIdentifier: string,
  signature: Signature,
): Promise<SubmittableExtrinsic<'promise', ISubmittableResult>> => {
  return api.tx.autoId.revokeCertificate(autoIdIdentifier, signature)
}

/*
  This function is used to deactivate the Auto-ID.

  @param api - The Auto-ID (@polkadot/api) API
  @param autoIdIdentifier - The Auto-ID identifier
  @param signature - The signature
  @returns The SubmittableExtrinsic object
*/
export const deactivateAutoId = async (
  api: ApiPromise,
  autoIdIdentifier: string,
  signature: Signature,
): Promise<SubmittableExtrinsic<'promise', ISubmittableResult>> => {
  return api.tx.autoId.deactivateAutoId(autoIdIdentifier, signature)
}

/*
  This function is used to renew the Auto-ID with the X.509 certificate.

  @param api - The Auto-ID (@polkadot/api) API
  @param autoIdIdentifier - The Auto-ID identifier
  @param newCertificate - The new X.509 certificate
  @returns The SubmittableExtrinsic object
*/
export const renewAutoId = async (
  api: ApiPromise,
  autoIdIdentifier: string,
  newCertificate: X509Certificate,
): Promise<SubmittableExtrinsic<'promise', ISubmittableResult>> => {
  const oldCertificate = await getCertificate(api, autoIdIdentifier)
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

  return api.tx.autoId.renewAutoId(autoIdIdentifier, req)
}
