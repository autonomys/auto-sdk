import { ActivateWalletInput, activateWallet } from '@autonomys/auto-utils'
import { address } from '../src/address'
import { balance } from '../src/balances'
import { transfer } from '../src/transfer'
import { events, setup, signAndSendTx } from './helpers'

describe('Verify transfer functions', () => {
  const { isLocalhost, TEST_NETWORK, ALICE_URI, ALICE_ADDRESS, BOB_ADDRESS } = setup()

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
        let blockHash: string | undefined

        const _balanceSenderStart = await balance(api, address(sender.address))
        const _balanceReceiverStart = await balance(api, address(BOB_ADDRESS))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        await signAndSendTx(sender, await transfer(api, BOB_ADDRESS, 1), [events.transfer])

        const _balanceSenderEnd = await balance(api, address(sender.address))
        const _balanceReceiverEnd = await balance(api, address(BOB_ADDRESS))
        expect(_balanceSenderEnd.free).toBeLessThan(_balanceSenderStart.free)
        expect(_balanceReceiverEnd.free).toBeGreaterThan(_balanceReceiverStart.free)
      }, 60000)
    })
  } else {
    test('Transfer test only run on localhost', async () => {
      expect(true).toBeTruthy()
    })
  }
})
