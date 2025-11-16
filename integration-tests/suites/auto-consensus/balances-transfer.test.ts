import { balance, events, transfer } from '@autonomys/auto-consensus'
import { address, signAndSendTx } from '@autonomys/auto-utils'
import { cleanupChains, setupChains, setupWallets, waitForBlocks } from '../../helpers'

const TRANSFER_AMOUNT = 1_000_000_000_000_000_000n

describe('Auto Consensus Balances & Transfers', () => {
  let apis: Awaited<ReturnType<typeof setupChains>>
  let wallets: Awaited<ReturnType<typeof setupWallets>>

  beforeAll(async () => {
    apis = await setupChains()
    wallets = await setupWallets(apis.consensus)
  }, 300000)

  afterAll(async () => {
    await cleanupChains(apis)
  })

  describe('balance()', () => {
    test('returns balances for seeded accounts', async () => {
      const aliceAccount = wallets[0].accounts[0]
      const aliceAddress = address(aliceAccount.address)

      const aliceBalance = await balance(apis.consensus, aliceAddress)

      expect(aliceBalance.free).toBeGreaterThan(0n)
      expect(aliceBalance.reserved).toBeGreaterThanOrEqual(0n)
    })
  })

  describe('transfer()', () => {
    test('moves funds between seeded accounts', async () => {
      const aliceAccount = wallets[0].accounts[0]
      const bobAccount = wallets[1].accounts[0]

      const aliceAddress = address(aliceAccount.address)
      const bobAddress = address(bobAccount.address)

      const aliceBalanceBefore = await balance(apis.consensus, aliceAddress)
      const bobBalanceBefore = await balance(apis.consensus, bobAddress)

      await signAndSendTx(
        aliceAccount,
        await transfer(apis.consensus, bobAccount.address, TRANSFER_AMOUNT),
        {},
        events.transfer,
      )

      await waitForBlocks(apis.consensus, 1)

      const aliceBalanceAfter = await balance(apis.consensus, aliceAddress)
      const bobBalanceAfter = await balance(apis.consensus, bobAddress)

      expect(aliceBalanceAfter.free).toBeLessThan(aliceBalanceBefore.free)
      expect(aliceBalanceAfter.free).toBeLessThanOrEqual(aliceBalanceBefore.free - TRANSFER_AMOUNT)
      expect(bobBalanceAfter.free).toBeGreaterThanOrEqual(bobBalanceBefore.free + TRANSFER_AMOUNT)
    }, 180000)
  })
})
