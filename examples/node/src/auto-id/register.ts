/**
 * Register auto id for issuer and user
 */

// CLEANUP: Remove debug logs from this file once RSA is tested ok.

import { Registry } from '@autonomys/auto-id'
import { Keyring } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { loadEnv, registerIssuerAutoId, registerLeafAutoId } from './utils'

async function main() {
  await cryptoWaitReady()

  const { RPC_URL, KEYPAIR_URI } = loadEnv()

  // Initialize the signer keypair
  const keyring = new Keyring({ type: 'sr25519' })
  const issuer = keyring.addFromUri(KEYPAIR_URI)

  // Initialize the Registry instance
  const registry = new Registry(RPC_URL!, issuer)

  /* Register Auto ID for issuer */
  console.log('\n===================== ISSUER =====================')
  const issuerFilePath = './res/private.issuer.pem'
  const issuerSubjectCommonName = 'test100'
  const [issuerAutoIdIdentifier, issuerCm] = await registerIssuerAutoId(
    registry,
    issuerFilePath,
    issuerSubjectCommonName,
  )

  /* Register Auto ID for user */
  console.log('\n\n===================== USER =====================')

  const userFilePath = './res/private.leaf.pem'
  const userSubjectCommonName = 'user100'
  const _userAutoIdIdentifier = await registerLeafAutoId(
    registry,
    userFilePath,
    issuerCm,
    issuerAutoIdIdentifier,
    userSubjectCommonName,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
