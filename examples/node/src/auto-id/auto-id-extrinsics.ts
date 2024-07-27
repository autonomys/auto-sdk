import {
  createAndSignCSR,
  generateEd25519KeyPair,
  generateRsaKeyPair,
  getCertificate,
  getCertificateAutoId,
  issueCertificate,
  loadPrivateKey,
  mapErrorCodeToEnum,
  prettyPrintCertificate,
  registerAutoId,
  saveKey,
  selfIssueCertificate,
} from '@autonomys/auto-id'
import { createConnection, KeyringPair, signAndSendTx } from '@autonomys/auto-utils'
import { X509Certificate } from '@peculiar/x509'
import { ApiPromise, Keyring } from '@polkadot/api'

export const registerIssuerAutoId = async (
  api: ApiPromise,
  signer: KeyringPair,
  issuerKeyPair: CryptoKeyPair,
  subjectCommonName: string,
): Promise<[string | null | undefined, X509Certificate]> => {
  const selfIssuedCert = await selfIssueCertificate(subjectCommonName, issuerKeyPair)
  const registerIssuer = registerAutoId(api, selfIssuedCert)
  const { receipt, identifier } = await signAndSendTx(signer, registerIssuer, {}, [], false)

  console.log(
    `===\nRegistered auto id from issuer cert: ${getCertificateAutoId(selfIssuedCert)} with identifier: ${identifier} in block #${receipt?.blockNumber?.toString()}`,
  )

  return [identifier, selfIssuedCert]
}

// const registerLeafAutoId = async (
//   api: ApiPromise,
//   signer: KeyringPair,
//   filePath: string,
//   issuerCert: X509Certificate,
//   issuerKeys: CryptoKeyPair,
//   issuerAutoIdIdentifier: string,
//   subjectCommonName: string,
// ): Promise<string> => {
//   const userKeys = await generateRsaKeyPair()
//   await saveKey(userKeys.privateKey, filePath)

//   const userCsr = await createAndSignCSR(subjectCommonName, userKeys)
//   const userCert = await issueCertificate(userCsr, {
//     certificate: issuerCert,
//     keyPair: issuerKeys,
//   })
//   prettyPrintCertificate(userCert)

//   const registerUser = await registerAutoId(api, signer, userCert, issuerAutoIdIdentifier)
//   const userAutoIdIdentifier = registerUser.identifier!
//   console.log(
//     `Registered auto id from user cert: ${getCertificateAutoId(userCert)} with identifier: ${userAutoIdIdentifier} in block #${registerUser.receipt?.blockNumber?.toString()}`,
//   )

//   return userAutoIdIdentifier
// }
