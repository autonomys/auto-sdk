/**
 * Revoke user/leaf certificate
 */

import {
  CertificateManager,
  Registry,
  cryptoKeyToPem,
  generateEd25519KeyPair2,
  pemToPrivateKey,
  saveKey,
} from '@autonomys/auto-id'
import { Keyring } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { config } from 'dotenv'

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

async function registerIssuerAutoId(
  registry: Registry,
  filePath: string,
): Promise<[string, CertificateManager]> {
  const issuerKeys = await generateEd25519KeyPair2() // Ed25519
  const issuerPemString = await cryptoKeyToPem(issuerKeys[0])
  saveKey(pemToPrivateKey(issuerPemString), filePath)

  const selfIssuedCm = new CertificateManager(null, issuerKeys[0], issuerKeys[1])
  const selfIssuedCert = await selfIssuedCm.selfIssueCertificate('test300')
  const registerIssuer = await registry.registerAutoId(selfIssuedCert)
  CertificateManager.prettyPrintCertificate(selfIssuedCert)
  const issuerAutoIdIdentifier = registerIssuer.identifier!
  console.log(
    `===\nRegistered auto id from issuer cert: ${CertificateManager.getCertificateAutoId(selfIssuedCert)} with identifier: ${issuerAutoIdIdentifier} in block #${registerIssuer.receipt?.blockNumber?.toString()}`,
  )
  return [issuerAutoIdIdentifier, selfIssuedCm]
}

async function registerLeafAutoId(
  registry: Registry,
  filePath: string,
  issuerCm: CertificateManager,
  issuerAutoIdIdentifier: string,
): Promise<string> {
  const userKeys = await generateEd25519KeyPair2() // Ed25519
  const userPemString = await cryptoKeyToPem(userKeys[0])
  saveKey(pemToPrivateKey(userPemString), filePath)

  const userCm = new CertificateManager(null, userKeys[0], userKeys[1])
  const userCsr = await userCm.createAndSignCSR('user300')
  const userCert = await issuerCm.issueCertificate(userCsr)
  CertificateManager.prettyPrintCertificate(userCert)
  const registerUser = await registry.registerAutoId(userCert, issuerAutoIdIdentifier)
  const userAutoIdIdentifier = registerUser.identifier!
  console.log(
    `Registered auto id from user cert: ${CertificateManager.getCertificateAutoId(userCert)} with identifier: ${userAutoIdIdentifier} in block #${registerUser.receipt?.blockNumber?.toString()}`,
  )

  return userAutoIdIdentifier
}

async function main() {
  await cryptoWaitReady()

  const { RPC_URL, KEYPAIR_URI } = loadEnv()

  // Initialize the signer keypair
  const keyring = new Keyring({ type: 'sr25519' })
  const issuer = keyring.addFromUri(KEYPAIR_URI)

  // Initialize the Registry instance
  const registry = new Registry(RPC_URL!, issuer)

  /* Register Auto ID for issuer & leaf */
  const filePathIssuer = './res/private.issuer.pem'
  const [issuerAutoIdIdentifier, issuerCm] = await registerIssuerAutoId(registry, filePathIssuer)

  const filePathLeaf = './res/private.leaf.pem'
  const leafAutoIdIdentifier = await registerLeafAutoId(
    registry,
    filePathLeaf,
    issuerCm,
    issuerAutoIdIdentifier,
  )

  /* Revoke leaf Certificate */
  const revoked = await registry.revokeCertificate(leafAutoIdIdentifier)
  if (revoked) {
    console.log(
      `Revoked registered user certificate with identifier: ${leafAutoIdIdentifier} in block #${revoked.blockNumber?.toString()}`,
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
