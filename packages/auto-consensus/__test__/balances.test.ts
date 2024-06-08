import type { NetworkInput } from '@autonomys/auto-utils'
import {
  ActivateWalletInput,
  activate,
  activateWallet,
  disconnect,
  networks,
} from '@autonomys/auto-utils'
import { address } from '../src/address'
import { balance, totalIssuance } from '../src/balances'

describe('Verify balances functions', () => {
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
      } as ActivateWalletInput)
      expect(accounts.length).toBeGreaterThan(0)
      expect(accounts[0].address).toEqual(TEST_ADDRESS)

      const _balance = await balance(api, address(accounts[0].address))
      expect(_balance.free).toEqual(BigInt(0))
    })

    if (isLocalhost) {
      test('Check balance of Alice wallet is greater than 0', async () => {
        const { api, accounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: ALICE_URI,
        } as ActivateWalletInput)
        expect(accounts.length).toBeGreaterThan(0)
        expect(accounts[0].address).toEqual(ALICE_ADDRESS)

        const _balance = await balance(api, address(accounts[0].address))
        expect(_balance.free).toBeGreaterThan(BigInt(0))
      })
    }
  })
})
