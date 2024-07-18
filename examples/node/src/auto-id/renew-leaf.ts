/**
 * Renew leaf's auto id
 *
 * Certificate is renewed keeping the same
 * - issuer's keypair,
 * - Subject Common Name
 * - Subject Public Key Info
 * - Auto ID
 *
 * but different serial no.
 */

import { Registry } from '@autonomys/auto-id'
import { Keyring } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { getNewCertificate, loadEnv, registerIssuerAutoId, registerLeafAutoId } from './utils'

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
  const issuerSubjectCommonName = 'test600'
  const [issuerAutoIdIdentifier, issuerCm] = await registerIssuerAutoId(
    registry,
    filePathIssuer,
    issuerSubjectCommonName,
  )

  const filePathLeaf = './res/private.leaf.pem'
  const userSubjectCommonName = 'user600'
  const leafAutoIdIdentifier = await registerLeafAutoId(
    registry,
    filePathLeaf,
    issuerCm,
    issuerAutoIdIdentifier,
    userSubjectCommonName,
  )

  /* Issue a new certificate */
  const newCert = await getNewCertificate(registry, filePathIssuer, leafAutoIdIdentifier) // M-1

  /* Renew Auto ID */
  const renewed = await registry.renewAutoId(leafAutoIdIdentifier, newCert)
  if (renewed) {
    console.log(
      `Renewed certificate of identifier: ${leafAutoIdIdentifier} in block #${renewed.receipt?.blockNumber?.toString()}`,
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
