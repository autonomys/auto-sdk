/**
 * Deactivate auto id
 *   - [x] issuer
 *   - [ ] TODO: user
 *
 * NOTE: Deactivation not possible for auto id whose certificate is already revoked.
 */

import { Registry } from '@autonomys/auto-id'
import { Keyring } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { loadEnv, registerIssuerAutoId } from './utils'

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
  const subjectCommonName = 'test400'

  const [issuerAutoIdIdentifier, _issuerCm] = await registerIssuerAutoId(
    registry,
    filePath,
    subjectCommonName,
  )

  /* Deactivate Auto ID */
  const deactivated = await registry.deactivateAutoId(issuerAutoIdIdentifier, filePath)
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
