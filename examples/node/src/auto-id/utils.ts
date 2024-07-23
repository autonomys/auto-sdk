import {
  CertificateManager,
  Registry,
  convertToWebCryptoAlgorithm,
  cryptoKeyToPem,
  extractPublicKeyAlgorithmOID,
  generateEd25519KeyPair,
  generateRsaKeyPair,
  hexToPemPublicKey,
  pemToCryptoKeyForSigning,
  pemToHex,
  saveKey,
} from '@autonomys/auto-id'
import { X509Certificate } from '@peculiar/x509'
import { config } from 'dotenv'
import * as fs from 'fs'

export const loadEnv = (): { RPC_URL: string; KEYPAIR_URI: string } => {
  const myEnv = config()
  if (myEnv.error) {
    throw new Error('Failed to load the .env file.')
  }

  const RPC_URL = process.env.RPC_URL
  if (!RPC_URL) {
    throw new Error('Please set your rpc url in a .env file')
  }

  const KEYPAIR_URI = process.env.KEYPAIR_URI
  if (!KEYPAIR_URI) {
    throw new Error('Please set your keypair uri in a .env file')
  }

  return { RPC_URL, KEYPAIR_URI }
}

export const registerIssuerAutoId = async (
  registry: Registry,
  filePath: string,
  subjectCommonName: string,
): Promise<[string, CertificateManager]> => {
  const issuerKeys = await generateRsaKeyPair() // FIXME: RSA
  // const issuerKeys = await generateEd25519KeyPair() // Ed25519
  // console.debug("user's private key algorithm: ", issuerKeys[0].algorithm.name)
  const issuerPublicKeyInfo = pemToHex(await cryptoKeyToPem(issuerKeys[1]))
  // console.debug('Issuer public key info:', issuerPublicKeyInfo)
  // console.debug(
  //   'Public key Algorithm identifier:',
  //   extractPublicKeyAlgorithmOID(issuerPublicKeyInfo),
  // )

  // Convert the CryptoKey to a PEM string
  saveKey(issuerKeys[0], filePath)
  // console.debug("issuer's private key algorithm: ", issuerKeys[0].algorithm.name)

  const selfIssuedCm = new CertificateManager(null, issuerKeys[0], issuerKeys[1])

  const selfIssuedCert = await selfIssuedCm.selfIssueCertificate(subjectCommonName)
  const registerIssuer = await registry.registerAutoId(selfIssuedCert)
  CertificateManager.prettyPrintCertificate(selfIssuedCert)
  const issuerAutoIdIdentifier = registerIssuer.identifier!
  console.log(
    `===\nRegistered auto id from issuer cert: ${CertificateManager.getCertificateAutoId(selfIssuedCert)} with identifier: ${issuerAutoIdIdentifier} in block #${registerIssuer.receipt?.blockNumber?.toString()}`,
  )

  return [issuerAutoIdIdentifier, selfIssuedCm]
}

export const registerLeafAutoId = async (
  registry: Registry,
  filePath: string,
  issuerCm: CertificateManager,
  issuerAutoIdIdentifier: string,
  subjectCommonName: string,
): Promise<string> => {
  const userKeys = await generateRsaKeyPair() // FIXME: RSA
  // const userKeys = await generateEd25519KeyPair() // Ed25519
  // console.debug("user's private key algorithm: ", userKeys[0].algorithm.name)
  // const userPublicKeyInfo = pemToHex(await cryptoKeyToPem(issuerKeys[1]))
  // console.debug('User public key info:', userPublicKeyInfo)
  // console.debug('PKI Algorithm OID:', extractPublicKeyAlgorithmOID(userPublicKeyInfo))

  // Convert the CryptoKey to a PEM string
  saveKey(userKeys[0], filePath)

  const userCm = new CertificateManager(null, userKeys[0], userKeys[1])
  const userCsr = await userCm.createAndSignCSR(subjectCommonName)
  // TODO: I think here 🤔, `selfIssuedCm` should be replaced with `userCm`. Then, the publicKeyInfo in the user's onchain certificate would be of user's public key than issuer's public key.
  const userCert = await issuerCm.issueCertificate(userCsr)
  CertificateManager.prettyPrintCertificate(userCert)
  // NOTE: Ideally, this could be registered by anyone (user/registrar), not just the issuer. Notes in Notion. Here, it's the issuer (Alice) sending the tx.
  const registerUser = await registry.registerAutoId(userCert, issuerAutoIdIdentifier)
  const userAutoIdIdentifier = registerUser.identifier!
  console.log(
    `Registered auto id from user cert: ${CertificateManager.getCertificateAutoId(userCert)} with identifier: ${userAutoIdIdentifier} in block #${registerUser.receipt?.blockNumber?.toString()}`,
  )

  return userAutoIdIdentifier
}

// Get a new certificate with the same private key (saved locally)
export const getNewCertificate = async (
  registry: Registry,
  filePath: string,
  autoIdIdentifier: string,
): Promise<X509Certificate> => {
  const certificate = await registry.getCertificate(autoIdIdentifier)
  const subjectPublicKeyInfo = certificate!.subjectPublicKeyInfo
  const algorithmOid = extractPublicKeyAlgorithmOID(subjectPublicKeyInfo)
  const webCryptoAlgorithm = convertToWebCryptoAlgorithm(algorithmOid)
  const privateKeyPem = fs.readFileSync(filePath, 'utf8').replace(/\\n/gm, '\n')
  const privateKey: CryptoKey = await pemToCryptoKeyForSigning(privateKeyPem, webCryptoAlgorithm)
  const publicKeyPem = hexToPemPublicKey(subjectPublicKeyInfo).replace(/\\n/gm, '\n')
  const publicKeyInfo: CryptoKey = await pemToCryptoKeyForSigning(publicKeyPem, webCryptoAlgorithm)

  // NOTE: publicKeyInfo is treated as the public key of the issuer
  const cm = new CertificateManager(null, privateKey, publicKeyInfo)
  const newCert = await cm.selfIssueCertificate(certificate!.subjectCommonName!)

  CertificateManager.prettyPrintCertificate(newCert)

  return newCert
}
