import { balance } from '@autonomys/auto-consensus'
import { cryptoWaitReady, setupWallet, signAndSendTx, type ApiPromise } from '@autonomys/auto-utils'
import {
  encodeAccountId32ToBytes32,
  getMinimumTransferAmount,
  isPrecompileDeployed,
  transferToConsensus,
  TRANSPORTER_PRECOMPILE_ADDRESS,
  transporterTransfer,
} from '@autonomys/auto-xdm'
import { HDNodeWallet, JsonRpcProvider, Mnemonic, Wallet } from 'ethers'
import { cleanupChains, setupChains, setupXDM, waitUntil } from '../../helpers'

const balanceIncreased = async (api: ApiPromise, address: string, balanceBefore: bigint) => {
  const currentBalance = await balance(api, address)
  return currentBalance.free > balanceBefore
}

describe('Transporter Precompile - E2E', () => {
  let apis: Awaited<ReturnType<typeof setupChains>>
  let consensusWallet: ReturnType<typeof setupWallet>
  let evmWallet: ReturnType<typeof setupWallet>
  let ethersWallet: Wallet
  let evmProvider: JsonRpcProvider

  const testMnemonic = 'test test test test test test test test test test test junk'
  const fundingAmount = 10n * 10n ** 18n
  const transferAmount = 5n * 10n ** 18n

  beforeAll(async () => {
    await cryptoWaitReady()

    apis = await setupChains()

    consensusWallet = setupWallet({ uri: '//Alice' })
    evmWallet = setupWallet({ mnemonic: testMnemonic, type: 'ethereum' })

    if (!consensusWallet.keyringPair || !evmWallet.keyringPair) {
      throw new Error('Keyring pairs not initialized')
    }

    // Setup ethers wallet
    const evmRpcUrl = process.env.EVM_RPC_URL || 'http://127.0.0.1:9945'
    evmProvider = new JsonRpcProvider(evmRpcUrl, undefined, { batchMaxCount: 1 })
    const mnemonic = Mnemonic.fromPhrase(testMnemonic)
    const hdWallet = HDNodeWallet.fromMnemonic(mnemonic, 'm')
    ethersWallet = new Wallet(hdWallet.privateKey, evmProvider)

    // Setup XDM
    await setupXDM(apis.consensus, apis.domain, 0)

    // Fund EVM wallet from consensus
    const evmBalanceBefore = await balance(apis.domain, evmWallet.address)
    if (evmBalanceBefore.free < fundingAmount) {
      console.log('Funding EVM wallet from consensus...')
      const tx = transporterTransfer(
        apis.consensus,
        { domainId: 0 },
        { accountId20: evmWallet.address },
        fundingAmount,
      )
      await signAndSendTx(consensusWallet.keyringPair!, tx)
      await waitUntil(() => balanceIncreased(apis.domain, evmWallet.address, evmBalanceBefore.free))
      console.log('EVM wallet funded')
    }
  }, 300000)

  afterAll(async () => {
    await cleanupChains(apis)
    evmProvider.destroy()
  }, 10000)

  describe('Precompile Availability', () => {
    test('isPrecompileDeployed returns true', async () => {
      const deployed = await isPrecompileDeployed(evmProvider)
      expect(deployed).toBe(true)
    })

    test('precompile address is correct', () => {
      expect(TRANSPORTER_PRECOMPILE_ADDRESS).toBe('0x0000000000000000000000000000000000000800')
    })
  })

  describe('Minimum Transfer Amount', () => {
    test('getMinimumTransferAmount returns a value', async () => {
      const minAmount = await getMinimumTransferAmount(evmProvider)
      expect(minAmount).toBeGreaterThanOrEqual(0n)
    })
  })

  describe('Account Encoding', () => {
    test('encodeAccountId32ToBytes32 encodes correctly', () => {
      const encoded = encodeAccountId32ToBytes32(consensusWallet.address)
      expect(encoded).toMatch(/^0x[a-f0-9]{64}$/)
    })
  })

  describe('EVM to Consensus Transfer', () => {
    test('transfers from EVM to consensus via precompile', async () => {
      const recipientBalanceBefore = await balance(apis.consensus, consensusWallet.address)
      const senderBalanceBefore = await evmProvider.getBalance(ethersWallet.address)

      expect(senderBalanceBefore).toBeGreaterThan(transferAmount)

      const result = await transferToConsensus(
        ethersWallet,
        consensusWallet.address,
        transferAmount,
      )

      expect(result.transactionHash).toMatch(/^0x[a-f0-9]{64}$/)
      expect(result.blockNumber).toBeGreaterThan(0)
      expect(result.success).toBe(true)

      // Wait for XDM to process
      await waitUntil(() =>
        balanceIncreased(apis.consensus, consensusWallet.address, recipientBalanceBefore.free),
      )

      const recipientBalanceAfter = await balance(apis.consensus, consensusWallet.address)
      const senderBalanceAfter = await evmProvider.getBalance(ethersWallet.address)

      expect(recipientBalanceAfter.free).toBeGreaterThan(recipientBalanceBefore.free)
      expect(senderBalanceAfter).toBeLessThan(senderBalanceBefore)
    }, 300000)

    test('transfer with confirmations: 0 returns immediately', async () => {
      const result = await transferToConsensus(
        ethersWallet,
        consensusWallet.address,
        transferAmount,
        { confirmations: 0 },
      )

      expect(result.transactionHash).toMatch(/^0x[a-f0-9]{64}$/)
      expect(result.blockNumber).toBe(0)
    }, 60000)
  })
})
