/**
 * Revoke self/issuer certificate
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
  const issuerSubjectCommonName = 'test200'
  const [issuerAutoIdIdentifier, _issuerCm] = await registerIssuerAutoId(
    registry,
    filePath,
    issuerSubjectCommonName,
  )

  /* Revoke self Certificate */
  const revoked = await registry.revokeCertificate(issuerAutoIdIdentifier, filePath)
  if (revoked) {
    console.log(
      `Revoked registered issuer certificate with identifier: ${issuerAutoIdIdentifier} in block #${revoked.blockNumber?.toString()}`,
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
