/**
 * Example of how to register an auto-id
 */

import * as x509 from '@peculiar/x509'
import { Keyring } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { config } from 'dotenv'
import { CertificateManager, Registry, generateEd25519KeyPair2 } from '../src/index'

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

async function register(
  certificate: x509.X509Certificate,
  registry: Registry,
  issuerId?: string | null | undefined,
) {
  // Attempt to register the certificate
  const { receipt, identifier } = await registry.registerAutoId(certificate, issuerId)
  if (receipt && receipt.isInBlock) {
    console.log(
      `Registration successful with Auto ID identifier: ${identifier} in block #${receipt.blockNumber?.toString()}`,
    )
    return identifier
  } else {
    console.log('Registration failed.')
  }
}

async function main() {
  await cryptoWaitReady()

  const { RPC_URL, KEYPAIR_URI } = loadEnv()

  // Initialize the signer keypair
  const keyring = new Keyring({ type: 'sr25519' })
  const issuer = keyring.addFromUri(KEYPAIR_URI)

  // Initialize the Registry instance
  const registry = new Registry(RPC_URL!, issuer)

  const keys = await generateEd25519KeyPair2()
  const selfIssuedCm = new CertificateManager(null, keys[0], keys[1])
  const selfIssuedCert = await selfIssuedCm.selfIssueCertificate('test6')
  const issuerId = await register(selfIssuedCert, registry)

  const userKeys = await generateEd25519KeyPair2()
  const userCm = new CertificateManager(null, userKeys[0], userKeys[1])
  const userCsr = await userCm.createAndSignCSR('user6')
  const userCert = await selfIssuedCm.issueCertificate(userCsr)
  CertificateManager.prettyPrintCertificate(userCert)
  const registerUser = await register(userCert, registry, issuerId!)

  console.log(`auto id from cert: ${CertificateManager.getCertificateAutoId(userCert)}`)
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
