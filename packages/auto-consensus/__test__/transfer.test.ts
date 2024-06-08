import type { NetworkInput } from '@autonomys/auto-utils'
import {
  ActivateWalletInput,
  activate,
  activateWallet,
  disconnect,
  networks,
} from '@autonomys/auto-utils'
import { address } from '../src/address'
import { balance } from '../src/balances'
import { transfer } from '../src/transfer'

describe('Verify transfer functions', () => {
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

  if (isLocalhost) {
    describe('Test transfer()', () => {
      test('Check transfer 1 ATC between Alice and Bob and check the balance before and after', async () => {
        const { api, accounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: ALICE_URI,
        } as ActivateWalletInput)
        expect(accounts.length).toBeGreaterThan(0)
        expect(accounts[0].address).toEqual(ALICE_ADDRESS)

        const sender = accounts[0]
        let txHash: string | undefined

        const _balanceSenderStart = await balance(api, address(sender.address))
        const _balanceReceiverStart = await balance(api, address(BOB_ADDRESS))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const tx = await transfer(api, BOB_ADDRESS, 1)

        await new Promise<void>((resolve, reject) => {
          tx.signAndSend(sender, ({ status }) => {
            if (status.isInBlock) {
              txHash = status.asInBlock.toHex()
              console.log('Successful transfer of 1 with hash ' + txHash)
              resolve()
            } else if (
              status.isRetracted ||
              status.isFinalityTimeout ||
              status.isDropped ||
              status.isInvalid
            ) {
              reject(new Error('Transaction failed'))
            } else {
              console.log('Status of transfer: ' + status.type)
            }
          })
        })

        expect(txHash).toBeDefined()

        const _balanceSenderEnd = await balance(api, address(sender.address))
        const _balanceReceiverEnd = await balance(api, address(BOB_ADDRESS))
        expect(_balanceSenderEnd.free).toBeLessThan(_balanceSenderStart.free)
        expect(_balanceReceiverEnd.free).toBeGreaterThan(_balanceReceiverStart.free)
      })
    })
  } else {
    test('Transfer test only run on localhost', async () => {
      expect(true).toBeTruthy()
    })
  }
})
