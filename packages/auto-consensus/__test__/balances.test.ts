import type { NetworkInput } from '@autonomys/auto-utils'
import { activate, activateWallet, disconnect, networks } from '@autonomys/auto-utils'
import { address } from '../src/address'
import { totalIssuance, transfer } from '../src/balances'

describe('Verify balances functions', () => {
  const isLocalhost = process.env.LOCALHOST === 'true'

  // Define the test network and its details
  const TEST_NETWORK: NetworkInput = !isLocalhost
    ? { networkId: networks[0].id }
    : { networkId: 'autonomys-localhost' }
  const TEST_INVALID_NETWORK = { networkId: 'invalid-network' }

  const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
  const TEST_ADDRESS = '5Fj5aLd4crCYn7zM5hLZL8m6e9aNzWssiTgA3TrprLjxy6Mc'
  const ALICE_URI = '//BOB'
  const ALICE_ADDRESS = '5DAw2FpYk2y3JHrsia14KEx7tpezNymdFKkunicZ5ygPGXYF'
  const BOB_URI = '//BOB'
  const BOB_ADDRESS = '5DAw2FpYk2y3JHrsia14KEx7tpezNymdFKkunicZ5ygPGXYF'

  beforeAll(async () => {
    await activate(TEST_NETWORK)
  })

  afterAll(async () => {
    await disconnect()
  })

  describe('Test totalIssuance()', () => {
    test('Check totalIssuance return a number greater than zero', async () => {
      // totalIssuance is an async function that returns a hex number as a string
      const rawIssuance = await totalIssuance()
      // Convert the hex number to a BigInt
      const issuance = BigInt(rawIssuance.toString())
      // Check if the issuance is greater than zero
      expect(issuance).toBeGreaterThan(BigInt(0))
    })
  })

  describe('Test balance()', () => {
    test('Check balance of Test wallet is 0', async () => {
      const { api, accounts } = await activateWallet({
        ...TEST_NETWORK,
        mnemonic: TEST_MNEMONIC,
      })

      const balance = await api.query.balances.account(address(accounts[0].address))
      expect(balance.free.toBigInt()).toEqual(BigInt(0))
    })
  })

  describe('Test transfer()', () => {
    if (isLocalhost) {
      test('Check transfer 1 ATC between Alice and Bob', async () => {
        const { api, accounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: ALICE_URI,
        })
        const sender = accounts[0]

        const hash = await transfer(api, sender, BOB_ADDRESS, 1)
      })
    }

    test('Check transfer 1 ATC between Test wallet and Alice should fail (no balance)', async () => {
      const { api, accounts } = await activateWallet({
        ...TEST_NETWORK,
        mnemonic: TEST_MNEMONIC,
      })
      const sender = accounts[0]

      expect(() => transfer(api, sender, ALICE_ADDRESS, 1)).toThrow(
        'Unreachable code should not be executed (evaluating',
        // To-Do: Confirm this is the expected error message
      )
    })
  })
})
