/**
 * Deactivate auto id
 *   - [x] issuer
 *   - [ ] TODO: user
 *
 * NOTE: Deactivation not possible for auto id whose certificate is already revoked.
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

async function registerAutoId(registry: Registry, filePath: string): Promise<string> {
  const issuerKeys = await generateEd25519KeyPair2() // Ed25519
  const issuerPemString = await cryptoKeyToPem(issuerKeys[0])
  saveKey(pemToPrivateKey(issuerPemString), filePath)

  const selfIssuedCm = new CertificateManager(null, issuerKeys[0], issuerKeys[1])
  const selfIssuedCert = await selfIssuedCm.selfIssueCertificate('test400')
  const registerIssuer = await registry.registerAutoId(selfIssuedCert)
  CertificateManager.prettyPrintCertificate(selfIssuedCert)
  const issuerAutoIdIdentifier = registerIssuer.identifier!
  console.log(
    `===\nRegistered auto id from issuer cert: ${CertificateManager.getCertificateAutoId(selfIssuedCert)} with identifier: ${issuerAutoIdIdentifier} in block #${registerIssuer.receipt?.blockNumber?.toString()}`,
  )
  return issuerAutoIdIdentifier
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

  /* Deactivate Auto ID */
  const deactivated = await registry.deactivateAutoId(issuerAutoIdIdentifier)
  if (deactivated) {
    console.log(
      `Deactivated auto id with identifier: ${issuerAutoIdIdentifier} in block #${deactivated.blockNumber?.toString()}`,
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
