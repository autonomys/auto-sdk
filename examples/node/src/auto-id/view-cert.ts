/* 
  View certificate corresponding to an Auto ID identifier.
*/

import { Registry } from '@autonomys/auto-id'
import { Keyring } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { config } from 'dotenv'

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

  const certificate = await registry.getCertificateRevocationList(identifier)
  console.log(JSON.stringify(certificate!, null, 2))
}

const identifier = process.argv[2]
main(identifier)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
