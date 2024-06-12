import { defaultNetwork, networks } from '../src/constants/network'
import type { NetworkInput } from '../src/types/network'
import { ActivateWalletInput, activateWallet, setupWallet } from '../src/wallet'

describe('Verify wallet functions', () => {
  const isLocalhost = process.env.LOCALHOST === 'true'

  // Define the test network and its details
  const TEST_NETWORK: NetworkInput = !isLocalhost
    ? { networkId: networks[0].id }
    : { networkId: 'autonomys-localhost' }
  const TEST_NETWORK_DETAIL = networks.find((network) => network.id === TEST_NETWORK.networkId)
  if (!TEST_NETWORK_DETAIL) throw new Error(`Network with id ${TEST_NETWORK.networkId} not found`)

  const TEST_INVALID_NETWORK = { networkId: 'invalid-network' }

  const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
  const TEST_ADDRESS = '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'
  const ALICE_URI = '//Alice'
  const ALICE_ADDRESS = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
  const BOB_URI = '//Bob'
  const BOB_ADDRESS = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

  describe('Test setupWallet()', () => {
    test('Check setupWallet return a pair with matching address and public key when provided with a mnemonic', async () => {
      const pair = await setupWallet({ mnemonic: TEST_MNEMONIC })
      expect(pair.address).toEqual(TEST_ADDRESS)
    })

    test('Check setupWallet return a pair with matching private key when provided with Alice seed', async () => {
      const pair = await setupWallet({ uri: ALICE_URI })
      expect(pair.address).toEqual(ALICE_ADDRESS)
    })

    test('Check setupWallet return a pair with matching private key when provided with Bob seed', async () => {
      const pair = await setupWallet({ uri: BOB_URI })
      expect(pair.address).toEqual(BOB_ADDRESS)
    })
  })

  describe('Test activateWallet()', () => {
    test('Check activateWallet return an api instance and an account when provided with a test mnemonic', async () => {
      const { api, accounts } = await activateWallet({
        ...TEST_NETWORK,
        mnemonic: TEST_MNEMONIC,
      } as ActivateWalletInput)
      expect(api).toBeDefined()
      expect(accounts.length).toBeGreaterThan(0)
      expect(accounts[0].address).toEqual(TEST_ADDRESS)
    })

    test('Check activateWallet return an api instance and an account when provided with Alice uri', async () => {
      const { api, accounts } = await activateWallet({
        ...TEST_NETWORK,
        uri: ALICE_URI,
      } as ActivateWalletInput)
      expect(api).toBeDefined()
      expect(accounts.length).toBeGreaterThan(0)
      expect(accounts[0].address).toEqual(ALICE_ADDRESS)
    })

    test('Check activateWallet return an api instance and an account when provided with Bob uri', async () => {
      const { api, accounts } = await activateWallet({
        ...TEST_NETWORK,
        uri: BOB_URI,
      } as ActivateWalletInput)
      expect(api).toBeDefined()
      expect(accounts.length).toBeGreaterThan(0)
      expect(accounts[0].address).toEqual(BOB_ADDRESS)
    })
  })
})
