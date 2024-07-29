import {
  createAndSignCSR,
  deactivateAutoId,
  getCertificateAutoId,
  issueCertificate,
  mapErrorCodeToEnum,
  registerAutoId,
  renewAutoId,
  revokeCertificate,
  selfIssueCertificate,
  Signature,
} from '@autonomys/auto-id'
import { ApiPromise, ISubmittableResult, KeyringPair, signAndSendTx } from '@autonomys/auto-utils'
import { X509Certificate } from '@peculiar/x509'

export const registerIssuerAutoId = async (
  api: ApiPromise,
  signer: KeyringPair,
  issuerKeyPair: CryptoKeyPair,
  subjectCommonName: string,
): Promise<[string | null | undefined, X509Certificate]> => {
  const selfIssuedCert = await selfIssueCertificate(subjectCommonName, issuerKeyPair)

  const registerIssuer = registerAutoId(api, selfIssuedCert)
  const { receipt, identifier } = await signAndSendTx(
    signer,
    registerIssuer,
    {},
    [],
    false,
    mapErrorCodeToEnum,
  )

  console.log(
    `===\nRegistered auto id from issuer cert: ${getCertificateAutoId(selfIssuedCert)} with identifier: ${identifier} in block #${receipt?.blockNumber?.toString()}`,
  )

  return [identifier, selfIssuedCert]
}

export const registerLeafAutoId = async (
  api: ApiPromise,
  signer: KeyringPair,
  issuerCert: X509Certificate,
  issuerKeys: CryptoKeyPair,
  issuerAutoIdIdentifier: string,
  leafKeys: CryptoKeyPair,
  subjectCommonName: string,
): Promise<[string | null | undefined, X509Certificate]> => {
  const leafCsr = await createAndSignCSR(subjectCommonName, leafKeys)
  const leafCert = await issueCertificate(leafCsr, {
    certificate: issuerCert,
    keyPair: issuerKeys,
  })

  const registerLeaf = registerAutoId(api, leafCert, issuerAutoIdIdentifier)
  const { receipt, identifier } = await signAndSendTx(
    signer,
    registerLeaf,
    {},
    [],
    false,
    mapErrorCodeToEnum,
  )

  console.log(
    `Registered auto id from leaf cert: ${getCertificateAutoId(leafCert)} with identifier: ${identifier} in block #${receipt?.blockNumber?.toString()}`,
  )

  return [identifier, leafCert]
}

export const revokeAutoID = async (
  api: ApiPromise,
  signer: KeyringPair,
  autoIdentifier: string,
  signature: Signature,
): Promise<ISubmittableResult> => {
  const revoke = await revokeCertificate(api, autoIdentifier, signature)
  const revoked = await signAndSendTx(signer, revoke, {}, [], false, mapErrorCodeToEnum)

  console.log(
    `Revoked auto id ${autoIdentifier} in block #${revoked.receipt?.blockNumber?.toString()}`,
  )

  return revoked.receipt
}

export const deactivateRegisteredAutoId = async (
  api: ApiPromise,
  signer: KeyringPair,
  autoIdentifier: string,
  signature: Signature,
): Promise<ISubmittableResult> => {
  const deactivate = await deactivateAutoId(api, autoIdentifier, signature)
  const deactivated = await signAndSendTx(signer, deactivate, {}, [], false, mapErrorCodeToEnum)

  console.log(
    `Deactivated auto id ${autoIdentifier} in block #${deactivated.receipt?.blockNumber?.toString()}`,
  )

  return deactivated.receipt
}

export const renewRegisteredAutoId = async (
  api: ApiPromise,
  signer: KeyringPair,
  autoIdentifier: string,
  newCertificate: X509Certificate,
): Promise<ISubmittableResult> => {
  const renew = await renewAutoId(api, autoIdentifier, newCertificate)
  const renewed = await signAndSendTx(signer, renew, {}, [], false, mapErrorCodeToEnum)

  console.log(
    `Renewed auto id ${autoIdentifier} in block #${renewed.receipt?.blockNumber?.toString()}`,
  )

  return renewed.receipt
}
