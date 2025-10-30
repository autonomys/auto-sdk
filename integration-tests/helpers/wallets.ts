import { mockWallets, type ApiPromise } from '@autonomys/auto-utils'

/**
 * Test wallet configuration
 */
export const TEST_WALLETS = {
  alice: {
    mnemonic: 'test test test test test test test test test test test junk',
    address: '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8',
  },
  // Add more predefined test wallets as needed
}

/**
 * Setup test wallets for integration tests
 */
export const setupWallets = async (api: ApiPromise) => {
  const wallets = await mockWallets({ networkId: 'localhost' }, api)
  return wallets
}
