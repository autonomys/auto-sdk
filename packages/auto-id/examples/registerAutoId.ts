/**
 * Example of how to register an auto-id
 */

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

async function main() {
  await cryptoWaitReady()

  const { RPC_URL, KEYPAIR_URI } = loadEnv()

  // Initialize the signer keypair
  const keyring = new Keyring({ type: 'sr25519' })
  const issuer = keyring.addFromUri(KEYPAIR_URI)

  // Initialize the Registry instance
  const registry = new Registry(RPC_URL!, issuer)

  /* Register Auto ID for issuer */
  const keys = await generateEd25519KeyPair2()
  const selfIssuedCm = new CertificateManager(null, keys[0], keys[1])
  const selfIssuedCert = await selfIssuedCm.selfIssueCertificate('test20')
  const registerIssuer = await registry.registerAutoId(selfIssuedCert)
  console.log(
    `===\nRegistered auto id from issuer cert: ${CertificateManager.getCertificateAutoId(selfIssuedCert)} with identifier: ${registerIssuer.identifier} in block #${registerIssuer.receipt?.blockNumber?.toString()}`,
  )

  /* Register Auto ID for user */
  const userKeys = await generateEd25519KeyPair2()
  const userCm = new CertificateManager(null, userKeys[0], userKeys[1])
  const userCsr = await userCm.createAndSignCSR('user20')
  const userCert = await selfIssuedCm.issueCertificate(userCsr)
  CertificateManager.prettyPrintCertificate(userCert)
  const registerUser = await registry.registerAutoId(userCert, registerIssuer.identifier!)
  console.log(
    `Registered auto id from user cert: ${CertificateManager.getCertificateAutoId(userCert)} with identifier: ${registerUser.identifier} in block #${registerUser.receipt?.blockNumber?.toString()}`,
  )

  // TODO: - Need to mimic in TS to create the signature before parsing into the extrinsic call
  // https://github.com/subspace/subspace/blob/ea685ddfdcb6b96122b9311d9137c3ab22176633/domains/pallets/auto-id/src/tests.rs#L369-L380

  /* Revoke Certificate */
  const revoked = await registry.revokeCertificate(registerIssuer.identifier!, userCert)
  console.log(
    `Revoked registered user certificate with identifier: ${registerIssuer.identifier!} in block #${revoked.blockNumber?.toString()}`,
  )

  /* Deactivate Certificate */
  const deactivated = await registry.deactivateAutoId(registerUser.identifier!, userCert)
  console.log(
    `Deactivated registered user certificate with identifier: ${registerUser.identifier!} in block #${deactivated.blockNumber?.toString()}`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
