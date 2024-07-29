import { ApiPromise, ISubmittableResult, SubmittableExtrinsic } from '@autonomys/auto-utils'
import { AsnParser, AsnSerializer } from '@peculiar/asn1-schema'
import { Certificate } from '@peculiar/asn1-x509'
import { X509Certificate } from '@peculiar/x509'
import { compactAddLength } from '@polkadot/util'
import {
  derEncodeSignatureAlgorithmOID,
  prepareSigningData,
  publicKeyAlgorithmToSignatureAlgorithm,
  signData,
} from './misc-utils'
import { AutoIdX509Certificate, CertificateActionType, Signature } from './types'

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

export const revokeCertificate = async (
  api: ApiPromise,
  autoIdIdentifier: string,
  signature: Signature,
): Promise<SubmittableExtrinsic<'promise', ISubmittableResult>> => {
  return api.tx.autoId.revokeCertificate(autoIdIdentifier, signature)
}

export const deactivateAutoId = async (
  api: ApiPromise,
  autoIdIdentifier: string,
  signature: Signature,
): Promise<SubmittableExtrinsic<'promise', ISubmittableResult>> => {
  return api.tx.autoId.deactivateAutoId(autoIdIdentifier, signature)
}

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
