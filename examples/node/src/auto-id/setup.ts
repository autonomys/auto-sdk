import { createConnection, cryptoWaitReady, Keyring } from '@autonomys/auto-utils'
import { pemToKeyPair, SupportedAlgorithm } from './crypto-utils'
import { loadEnv } from './utils'

export const setup = async (keyTypeAlgorithm: SupportedAlgorithm = 'RSASSA-PKCS1-v1_5') => {
  await cryptoWaitReady()

  const { RPC_URL, KEYPAIR_URI } = loadEnv()

  // Initialize the signer keypair
  const keyring = new Keyring({ type: 'sr25519' })
  const signer = keyring.addFromUri(KEYPAIR_URI)

  // Initialize the API
  const api = await createConnection(RPC_URL!)

  const keyType = keyTypeAlgorithm === 'RSASSA-PKCS1-v1_5' ? 'rsa' : 'ed25519'
  //Load keys
  const issuerPrivateFilePath = `./res/issuer.${keyType}.private.pem`
  const issuerPublicFilePath = `./res/issuer.${keyType}.private.pem`
  const issuerKeys = await pemToKeyPair(
    issuerPrivateFilePath,
    issuerPublicFilePath,
    keyTypeAlgorithm,
  )

  const leafPrivateFilePath = `./res/leaf.${keyType}.private.pem`
  const leafPublicFilePath = `./res/leaf.${keyType}.private.pem`
  const leafKeys = await pemToKeyPair(leafPrivateFilePath, leafPublicFilePath, keyTypeAlgorithm)

  return { api, signer, issuerKeys, leafKeys }
}
