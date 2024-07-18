/* 
  View certificate corresponding to an Auto ID identifier.
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

  const certificate = await registry.getCertificate(identifier)
  console.log(JSON.stringify(certificate!, null, 2))
}

const identifier = process.argv[2]
main(identifier)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
