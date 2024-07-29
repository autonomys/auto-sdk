import {
  createAndSignCSR,
  getCertificateAutoId,
  issueCertificate,
  prettyPrintCertificate,
  registerAutoId,
  selfIssueCertificate,
} from '@autonomys/auto-id'
import { ApiPromise, KeyringPair, signAndSendTx } from '@autonomys/auto-utils'
import { X509Certificate } from '@peculiar/x509'

export const registerIssuerAutoId = async (
  api: ApiPromise,
  signer: KeyringPair,
  issuerKeyPair: CryptoKeyPair,
  subjectCommonName: string,
): Promise<[string | null | undefined, X509Certificate]> => {
  const selfIssuedCert = await selfIssueCertificate(subjectCommonName, issuerKeyPair)
  prettyPrintCertificate(selfIssuedCert)

  const registerIssuer = registerAutoId(api, selfIssuedCert)
  const { receipt, identifier } = await signAndSendTx(signer, registerIssuer, {}, [], false)

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
  prettyPrintCertificate(leafCert)

  const registerLeaf = registerAutoId(api, leafCert, issuerAutoIdIdentifier)
  const { receipt, identifier } = await signAndSendTx(signer, registerLeaf, {}, [], false)

  console.log(
    `Registered auto id from leaf cert: ${getCertificateAutoId(leafCert)} with identifier: ${identifier} in block #${receipt?.blockNumber?.toString()}`,
  )

  return [identifier, leafCert]
}
