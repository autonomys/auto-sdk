import type { NetworkInput } from '@autonomys/auto-utils'
import { networks } from '@autonomys/auto-utils'

export const setup = () => {
  const isLocalhost = process.env.LOCALHOST === 'true'

  // Define the test network and its details
  const TEST_NETWORK: NetworkInput = !isLocalhost
    ? { networkId: networks[0].id }
    : { networkId: 'autonomys-localhost' }
  const TEST_INVALID_NETWORK = { networkId: 'invalid-network' }

  const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
  const TEST_ADDRESS = '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'

  return {
    isLocalhost,
    TEST_NETWORK,
    TEST_INVALID_NETWORK,
    TEST_MNEMONIC,
    TEST_ADDRESS,
  }
}
