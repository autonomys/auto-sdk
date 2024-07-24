/* 
  View serial no.s of revoked certificates from the registry.

  Usage:
  ======
  - If an issuer is revoked, then to see the revoked serials parse the issuer's identifier.
  - If a leaf is revoked, then also parse the issuer's identifier and see the revoked serials.
*/

import { Registry } from '@autonomys/auto-id'
import { Keyring } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { loadEnv } from './utils'

async function main(identifier: string) {
  if (!identifier) {
    throw new Error('Please provide an Auto ID identifier')
  }

  await cryptoWaitReady()

  const { RPC_URL, KEYPAIR_URI } = loadEnv()

  // Initialize the signer keypair
  const keyring = new Keyring({ type: 'sr25519' })
  const issuer = keyring.addFromUri(KEYPAIR_URI)

  // Initialize the Registry instance
  const registry = new Registry(RPC_URL!, issuer)

  const revokedCertSerials = await registry.getCertificateRevocationList(identifier)
  console.log(revokedCertSerials)
}

const identifier = process.argv[2]
main(identifier)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
