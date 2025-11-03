import { balance } from '@autonomys/auto-consensus'
import { cryptoWaitReady, setupWallet, signAndSendTx, type ApiPromise } from '@autonomys/auto-utils'
import {
  transferToConsensus,
  transferToDomainAccount20Type,
  unconfirmedTransfers,
} from '@autonomys/auto-xdm'
import { cleanupChains, setupChains, setupXDM, waitUntil } from '../../helpers'

// Has balance increased since last check
const balanceIncreased = async (api: ApiPromise, address: string, balanceBefore: bigint) => {
  const currentBalance = await balance(api, address)
  const transferConfirmed = currentBalance.free > balanceBefore

  return transferConfirmed
}

describe('XDM Transfers - E2E', () => {
  let apis: Awaited<ReturnType<typeof setupChains>>
  let consensusWallet: ReturnType<typeof setupWallet>
  let domainWallet: ReturnType<typeof setupWallet>
  const c2dTransferAmount = 10n * 10n ** 18n // 10 TSSC
  const d2cTransferAmount = 5n * 10n ** 18n // 5 TSSC

  beforeAll(async () => {
    // Wait for WASM crypto to be initialized before creating wallets
    await cryptoWaitReady()

    apis = await setupChains()

    // Initialize wallets after crypto is ready
    consensusWallet = setupWallet({ uri: '//Alice' })
    // For EVM domain (domain 0), we need an ethereum-style address
    // Ethereum wallets require mnemonic, not URI
    domainWallet = setupWallet({
      mnemonic: 'test test test test test test test test test test test junk',
      type: 'ethereum',
    })

    if (!consensusWallet.keyringPair || !domainWallet.keyringPair) {
      throw new Error('Keyring pairs not initialized')
    }
    // Setup XDM between consensus and domain before running tests
    await setupXDM(apis.consensus, apis.domain, 0)
  }, 30000)

  afterAll(async () => {
    await cleanupChains(apis)
  }, 10000)

  describe('Consensus to Domain Transfers', () => {
    test('should transfer from consensus to domain and update balances', async () => {
      // Get balances before transfer
      const senderBalanceBefore = await balance(apis.consensus, consensusWallet.address)
      const receiverBalanceBefore = await balance(apis.domain, domainWallet.address)

      // Get unconfirmed transfers before
      const unconfirmedBefore = await unconfirmedTransfers(apis.consensus, 'consensus', {
        domainId: 0,
      })

      const tx = await transferToDomainAccount20Type(
        apis.consensus,
        0,
        domainWallet.address,
        c2dTransferAmount,
      )

      // Send transaction and wait for inclusion
      await signAndSendTx(consensusWallet.keyringPair!, tx)

      // Check unconfirmed transfers increased
      const unconfirmedAfterInit = await unconfirmedTransfers(apis.consensus, 'consensus', {
        domainId: 0,
      })
      expect(BigInt(unconfirmedAfterInit.toString())).toBeGreaterThan(
        BigInt(unconfirmedBefore.toString()),
      )

      await waitUntil(() =>
        balanceIncreased(apis.domain, domainWallet.address, receiverBalanceBefore.free),
      )

      // Verify balances changed
      const senderBalanceAfter = await balance(apis.consensus, consensusWallet.address)
      const receiverBalanceAfter = await balance(apis.domain, domainWallet.address)

      // Sender should have less (transfer amount + fees)
      expect(BigInt(senderBalanceAfter.free)).toBeLessThan(BigInt(senderBalanceBefore.free))

      // Receiver should have more
      expect(BigInt(receiverBalanceAfter.free)).toBeGreaterThan(BigInt(receiverBalanceBefore.free))

      console.log('✅ Consensus → Domain transfer completed successfully')
    }, 300000)
  })

  describe('Domain to Consensus Transfers', () => {
    test('should transfer from domain to consensus and update balances', async () => {
      // Get balances before transfer
      const senderBalanceBefore = await balance(apis.domain, domainWallet.address)
      const receiverBalanceBefore = await balance(apis.consensus, consensusWallet.address)

      // Get unconfirmed transfers before
      const unconfirmedBefore = await unconfirmedTransfers(
        apis.consensus,
        { domainId: 0 },
        'consensus',
      )

      const tx = await transferToConsensus(apis.domain, consensusWallet.address, d2cTransferAmount)
      await signAndSendTx(domainWallet.keyringPair!, tx, {}, [], false)

      // Wait for unconfirmed transfers to increase
      await waitUntil(async () => {
        const unconfirmedAfterInit = await unconfirmedTransfers(
          apis.consensus,
          { domainId: 0 },
          'consensus',
        )
        return BigInt(unconfirmedAfterInit.toString()) > BigInt(unconfirmedBefore.toString())
      })
      const unconfirmedAfterInit = await unconfirmedTransfers(
        apis.consensus,
        { domainId: 0 },
        'consensus',
      )
      expect(BigInt(unconfirmedAfterInit.toString())).toBeGreaterThan(
        BigInt(unconfirmedBefore.toString()),
      )
      console.log('Unconfirmed transfers increased')

      // Wait for transfer to be finalized (balance should increase on consensus)
      await waitUntil(() =>
        balanceIncreased(apis.consensus, consensusWallet.address, receiverBalanceBefore.free),
      )

      // Verify balances changed
      const senderBalanceAfter = await balance(apis.domain, domainWallet.address)
      const receiverBalanceAfter = await balance(apis.consensus, consensusWallet.address)

      // Sender should have less (transfer amount + fees)
      expect(BigInt(senderBalanceAfter.free)).toBeLessThan(BigInt(senderBalanceBefore.free))

      // Receiver should have more
      expect(BigInt(receiverBalanceAfter.free)).toBeGreaterThan(BigInt(receiverBalanceBefore.free))

      console.log('✅ Domain → Consensus transfer completed successfully')
    }, 300000)
  })
})
