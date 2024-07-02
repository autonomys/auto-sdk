/**
 * Example of using auto-id registry:
 * - Register auto id for issuer and user
 * - Revoke certificate of issuer or user
 *
 */

import { Keyring } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { config } from 'dotenv'
import { CertificateManager, Registry, generateEd25519KeyPair2, saveKey } from '../src/index'
import { cryptoKeyToPem, generateRsaKeyPair, pemToPrivateKey } from '../src/keyManagement'

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

async function main(taskName: string, identifier: string) {
  await cryptoWaitReady()

  const { RPC_URL, KEYPAIR_URI } = loadEnv()

  // Initialize the signer keypair
  const keyring = new Keyring({ type: 'sr25519' })
  const issuer = keyring.addFromUri(KEYPAIR_URI)

  // Initialize the Registry instance
  const registry = new Registry(RPC_URL!, issuer)

  if (taskName === 'register') {
    /* Register Auto ID for issuer */
    const issuerKeys = await generateEd25519KeyPair2()
    // Convert the CryptoKey to a PEM string
    const issuerPemString = await cryptoKeyToPem(issuerKeys[0])
    // save issuer private key for later use
    saveKey(pemToPrivateKey(issuerPemString), './res/private.issuer.pem')
    const selfIssuedCm = new CertificateManager(null, issuerKeys[0], issuerKeys[1])
    const selfIssuedCert = await selfIssuedCm.selfIssueCertificate('test22')
    const registerIssuer = await registry.registerAutoId(selfIssuedCert)
    const issuerAutoIdIdentifier = registerIssuer.identifier!
    console.log(
      `===\nRegistered auto id from issuer cert: ${CertificateManager.getCertificateAutoId(selfIssuedCert)} with identifier: ${issuerAutoIdIdentifier} in block #${registerIssuer.receipt?.blockNumber?.toString()}`,
    )

    /* Register Auto ID for user */
    // const userKeys = generateRsaKeyPair()
    // saveKey(pemToPrivateKey(userKeys[0]), './res/private.leaf.pem')
    // const userCm = new CertificateManager(null, userKeys[0], userKeys[1])

    const userKeys = await generateEd25519KeyPair2()
    // Convert the CryptoKey to a PEM string
    const userPemString = await cryptoKeyToPem(userKeys[0])
    // save issuer private key for later use
    saveKey(pemToPrivateKey(userPemString), './res/private.leaf.pem')
    const userCm = new CertificateManager(null, userKeys[0], userKeys[1])
    const userCsr = await userCm.createAndSignCSR('user22')
    const userCert = await selfIssuedCm.issueCertificate(userCsr)
    CertificateManager.prettyPrintCertificate(userCert)
    const registerUser = await registry.registerAutoId(userCert, issuerAutoIdIdentifier)
    console.log(
      `Registered auto id from user cert: ${CertificateManager.getCertificateAutoId(userCert)} with identifier: ${registerUser.identifier} in block #${registerUser.receipt?.blockNumber?.toString()}`,
    )
  } else if (taskName === 'revoke') {
    /* Revoke self Certificate */
    const revoked = await registry.revokeCertificate(identifier)
    console.log(
      `Revoked registered user certificate with identifier: ${identifier} in block #${revoked.blockNumber?.toString()}`,
    )
  } else {
    throw new Error('Task not recognized')
  }
}

const taskName = process.argv[2]
const identifier = process.argv[3]
main(taskName, identifier)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

/* Deactivate Certificate */
// const deactivated = await registry.deactivateAutoId(registerUser.identifier!, userCert)
// console.log(
//   `Deactivated registered user certificate with identifier: ${registerUser.identifier!} in block #${deactivated.blockNumber?.toString()}`,
// )
