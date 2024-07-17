/**
 * Renew issuer's auto id
 *
 * Certificate is renewed keeping the same
 * - issuer's keypair,
 * - Subject Common Name
 * - Subject Public Key Info
 * - Auto ID
 *
 * but different serial no.
 */

import {
  CertificateManager,
  Registry,
  convertToWebCryptoAlgorithm,
  extractSignatureAlgorithmOID,
  generateEd25519KeyPair,
  hexToPemPublicKey,
  pemToCryptoKeyForSigning,
  saveKey,
} from '@autonomys/auto-id'
import { X509Certificate } from '@peculiar/x509'
import { Keyring } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { config } from 'dotenv'
import * as fs from 'fs'

function loadEnv(): { RPC_URL: string; KEYPAIR_URI: string } {
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

async function registerAutoId(registry: Registry, filePath: string): Promise<string> {
  const issuerKeys = await generateEd25519KeyPair() // Ed25519
  saveKey(issuerKeys[0], filePath)

  const selfIssuedCm = new CertificateManager(null, issuerKeys[0], issuerKeys[1])
  const selfIssuedCert = await selfIssuedCm.selfIssueCertificate('test500')
  const registerIssuer = await registry.registerAutoId(selfIssuedCert)
  CertificateManager.prettyPrintCertificate(selfIssuedCert)
  const issuerAutoIdIdentifier = registerIssuer.identifier!
  console.log(
    `===\nRegistered auto id from issuer cert: ${CertificateManager.getCertificateAutoId(selfIssuedCert)} with identifier: ${issuerAutoIdIdentifier} in block #${registerIssuer.receipt?.blockNumber?.toString()}`,
  )
  return issuerAutoIdIdentifier
}

// Get a new certificate with the same private key (saved locally)
async function getNewCertificate(
  registry: Registry,
  filePath: string,
  autoIdIdentifier: string,
): Promise<X509Certificate> {
  const certificate = await registry.getCertificate(autoIdIdentifier)
  const subjectPublicKeyInfo = certificate!.subjectPublicKeyInfo
  const algorithmOid = extractSignatureAlgorithmOID(subjectPublicKeyInfo)
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

async function main() {
  await cryptoWaitReady()

  const { RPC_URL, KEYPAIR_URI } = loadEnv()

  // Initialize the signer keypair
  const keyring = new Keyring({ type: 'sr25519' })
  const issuer = keyring.addFromUri(KEYPAIR_URI)

  // Initialize the Registry instance
  const registry = new Registry(RPC_URL!, issuer)

  /* Register Auto ID */
  const filePath = './res/private.issuer.pem'
  const issuerAutoIdIdentifier = await registerAutoId(registry, filePath)

  /* Issue a new certificate */
  const newCert = await getNewCertificate(registry, filePath, issuerAutoIdIdentifier)

  /* Renew Auto ID */
  const renewed = await registry.renewAutoId(issuerAutoIdIdentifier, newCert)
  if (renewed) {
    console.log(
      `Renewed certificate of identifier: ${issuerAutoIdIdentifier} in block #${renewed.receipt?.blockNumber?.toString()}`,
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
