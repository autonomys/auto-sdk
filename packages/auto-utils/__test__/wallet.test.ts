import { defaultNetwork, networks } from '../src/constants/network'
import type { NetworkInput } from '../src/types/network'
import { activateWallet, setupWallet } from '../src/wallet'

describe('Verify wallet functions', () => {
  const isLocalhost = process.env.LOCALHOST === 'true'

  // Define the test network and its details
  const TEST_NETWORK: NetworkInput = !isLocalhost
    ? { networkId: networks[0].id }
    : { networkId: 'autonomys-localhost' }
  const TEST_NETWORK_DETAIL = networks.find((network) => network.id === TEST_NETWORK.networkId)
  if (!TEST_NETWORK_DETAIL) throw new Error(`Network with id ${TEST_NETWORK.networkId} not found`)

  const TEST_INVALID_NETWORK = { networkId: 'invalid-network' }

  const TEST_MNEMONIC = 'test test test test test test test test test test test junk' //Alice
  const TEST_ADDRESS = '5Fj5aLd4crCYn7zM5hLZL8m6e9aNzWssiTgA3TrprLjxy6Mc'
  const ALICE_URI = '//BOB'
  const ALICE_ADDRESS = '5DAw2FpYk2y3JHrsia14KEx7tpezNymdFKkunicZ5ygPGXYF'
  const BOB_URI = '//BOB'
  const BOB_ADDRESS = '5DAw2FpYk2y3JHrsia14KEx7tpezNymdFKkunicZ5ygPGXYF'

  describe('Test setupWallet()', () => {
    test('Check setupWallet return a pair with matching address and public key when provided with a mnemonic', async () => {
      const pair = setupWallet({ mnemonic: TEST_MNEMONIC })
      expect(pair.address).toEqual(TEST_ADDRESS)
    })

    test('Check setupWallet return a pair with matching private key when provided with Alice pk', async () => {
      const pair = setupWallet({ uri: ALICE_URI })
      expect(pair.address).toEqual(ALICE_ADDRESS)
    })

    test('Check setupWallet return a pair with matching private key when provided with Bob pk', async () => {
      const pair = setupWallet({ uri: BOB_URI })
      expect(pair.address).toEqual(BOB_ADDRESS)
    })
  })

  describe('Test activateWallet()', () => {
    test('Check activateWallet return an api instance and an account when provided with a test mnemonic', async () => {
      const { api, accounts } = await activateWallet({
        ...TEST_NETWORK,
        mnemonic: TEST_MNEMONIC,
      })
      expect(api).toBeDefined()
      expect(accounts.length).toBeGreaterThan(0)
      expect(accounts[0].address).toEqual(TEST_ADDRESS)
    })

    test('Check activateWallet return an api instance and an account when provided with Alice uri', async () => {
      const { api, accounts } = await activateWallet({
        ...TEST_NETWORK,
        uri: BOB_URI,
      })
      expect(api).toBeDefined()
      expect(accounts.length).toBeGreaterThan(0)
      expect(accounts[0].address).toEqual(ALICE_ADDRESS)
    })

    test('Check activateWallet return an api instance and an account when provided with Alice uri', async () => {
      const { api, accounts } = await activateWallet({
        ...TEST_NETWORK,
        uri: ALICE_URI,
      })
      expect(api).toBeDefined()
      expect(accounts.length).toBeGreaterThan(0)
      expect(accounts[0].address).toEqual(BOB_ADDRESS)
    })
  })
})
