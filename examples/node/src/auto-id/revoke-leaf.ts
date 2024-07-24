/**
 * Revoke user/leaf certificate
 */

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

  /* Register Auto ID for issuer & leaf */
  const filePathIssuer = './res/private.issuer.pem'
  const issuerSubjectCommonName = 'test300'
  const [issuerAutoIdIdentifier, issuerCm] = await registerIssuerAutoId(
    registry,
    filePathIssuer,
    issuerSubjectCommonName,
  )

  const filePathLeaf = './res/private.leaf.pem'
  const leafSubjectCommonName = 'user300'
  const leafAutoIdIdentifier = await registerLeafAutoId(
    registry,
    filePathLeaf,
    issuerCm,
    issuerAutoIdIdentifier,
    leafSubjectCommonName,
  )

  /* Revoke leaf Certificate */
  const revoked = await registry.revokeCertificate(leafAutoIdIdentifier, filePathIssuer)
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
