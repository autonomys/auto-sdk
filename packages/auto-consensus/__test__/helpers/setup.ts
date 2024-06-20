import type { NetworkInput } from '@autonomys/auto-utils'
import { activate, disconnect, networks } from '@autonomys/auto-utils'

export const setup = () => {
  const isLocalhost = process.env.LOCALHOST === 'true'

  // Define the test network and its details
  const TEST_NETWORK: NetworkInput = !isLocalhost
    ? { networkId: networks[0].id }
    : { networkId: 'autonomys-localhost' }
  const TEST_INVALID_NETWORK = { networkId: 'invalid-network' }

  const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
  const TEST_ADDRESS = '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'
  const ALICE_URI = '//Alice'
  const ALICE_ADDRESS = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
  const BOB_URI = '//Bob'
  const BOB_ADDRESS = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

  beforeAll(async () => {
    await activate(TEST_NETWORK)
  })

  afterAll(async () => {
    await disconnect()
  })

  return {
    isLocalhost,
    TEST_NETWORK,
    TEST_INVALID_NETWORK,
    TEST_MNEMONIC,
    TEST_ADDRESS,
    ALICE_URI,
    ALICE_ADDRESS,
    BOB_URI,
    BOB_ADDRESS,
  }
}
