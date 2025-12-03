import { balance } from '@autonomys/auto-consensus'
import {
  createConnection,
  cryptoWaitReady,
  setupWallet,
  signAndSendTx,
  type ApiPromise,
} from '@autonomys/auto-utils'
import {
  chainAllowlist,
  channels,
  encodeAccountId32ToBytes32,
  getMinimumTransferAmount,
  initiateChannel,
  isPrecompileDeployed,
  nextChannelId,
  transferToConsensus,
  TRANSPORTER_PRECOMPILE_ADDRESS,
  transporterTransfer,
} from '@autonomys/auto-xdm'
import 'dotenv/config'
import {
  Contract,
  HDNodeWallet,
  JsonRpcProvider,
  Mnemonic,
  Wallet,
  WebSocketProvider,
} from 'ethers'

/**
 * Example demonstrating the full round-trip flow:
 * 1. Transfer funds from Consensus (Alice) → EVM Domain
 * 2. Transfer funds from EVM Domain → Consensus (Bob) using the Transporter Precompile
 *
 * The Transporter Precompile is deployed at address 0x0800 (2048) on EVM domains.
 * It provides two main functions:
 * - minimum_transfer_amount() returns (uint256)
 * - transfer_to_consensus_v1(bytes32 accountId32, uint256 amount)
 *
 * @see https://github.com/autonomys/subspace/pull/3714
 */

// ============================================================================
// Configuration
// ============================================================================
//
// Environment Variables:
//
//   RPC Endpoints:
//     CONSENSUS_RPC_URL    - Consensus chain WebSocket RPC (default: ws://127.0.0.1:9944)
//     DOMAIN_RPC_URL       - Domain chain WebSocket RPC (default: ws://127.0.0.1:9945)
//     EVM_RPC_URL          - EVM JSON-RPC endpoint (default: http://127.0.0.1:9945)
//
//   Consensus Wallets:
//     CONSENSUS_SENDER_URI       - Substrate URI for sender wallet (default: //Alice)
//     CONSENSUS_RECIPIENT_URI    - Substrate URI for recipient wallet (default: //Bob)
//     CONSENSUS_SENDER_MNEMONIC  - Mnemonic for sender wallet (overrides URI)
//     CONSENSUS_RECIPIENT_MNEMONIC - Mnemonic for recipient wallet (overrides URI)
//
//   EVM Wallet:
//     EVM_MNEMONIC         - Mnemonic for EVM wallet (default: test mnemonic)
//     EVM_PRIVATE_KEY      - Private key for EVM wallet (overrides mnemonic, 0x-prefixed)
//
//   Transfer Amounts:
//     TRANSFER_TO_EVM_AMOUNT     - Amount to transfer consensus→EVM in AI3 (default: 10)
//     TRANSFER_TO_CONSENSUS_AMOUNT - Amount to transfer EVM→consensus in AI3 (default: 5)
//
//   XDM Setup (dev networks only):
//     SKIP_XDM_SETUP       - Set to "true" to skip XDM setup (for production networks)
//     SUDO_URI             - Substrate URI for sudo account (default: //Alice)
//
// Example usage for mainnet:
//   CONSENSUS_RPC_URL=wss://rpc.mainnet.autonomys.xyz/ws \
//   DOMAIN_RPC_URL=wss://auto-evm.mainnet.autonomys.xyz/ws \
//   EVM_RPC_URL=wss://auto-evm.mainnet.autonomys.xyz/ws \
//   CONSENSUS_SENDER_MNEMONIC="your twelve word mnemonic here" \
//   EVM_MNEMONIC="your twelve word mnemonic here" \
//   SKIP_XDM_SETUP=true \
//   yarn transporter-precompile
//
// ============================================================================

const CONFIG = {
  consensusRpcUrl: process.env.CONSENSUS_RPC_URL || 'ws://127.0.0.1:9944',
  domainRpcUrl: process.env.DOMAIN_RPC_URL || 'ws://127.0.0.1:9945',
  evmRpcUrl: process.env.EVM_RPC_URL || 'http://127.0.0.1:9945',
  domainId: 0,
  consensusSenderUri: process.env.CONSENSUS_SENDER_URI || '//Alice',
  consensusSenderMnemonic: process.env.CONSENSUS_SENDER_MNEMONIC,
  consensusRecipientUri: process.env.CONSENSUS_RECIPIENT_URI || '//Bob',
  consensusRecipientMnemonic: process.env.CONSENSUS_RECIPIENT_MNEMONIC,
  evmMnemonic:
    process.env.EVM_MNEMONIC || 'test test test test test test test test test test test junk',
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
  consensusToEvmAmount: BigInt(process.env.TRANSFER_TO_EVM_AMOUNT || '10') * 10n ** 18n,
  evmToConsensusAmount: BigInt(process.env.TRANSFER_TO_CONSENSUS_AMOUNT || '5') * 10n ** 18n,
  skipXdmSetup: process.env.SKIP_XDM_SETUP === 'true',
  sudoUri: process.env.SUDO_URI || '//Alice',
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const waitUntil = async (
  condition: () => Promise<boolean>,
  timeoutMs = 300000,
  pollIntervalMs = 2000,
): Promise<void> => {
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) return
    await sleep(pollIntervalMs)
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`)
}

const waitForBlocks = async (api: ApiPromise, count: number, timeoutMs = 60000): Promise<void> => {
  const initialHeader = await api.rpc.chain.getHeader()
  const targetBlockNumber = initialHeader.number.toNumber() + count
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const header = await api.rpc.chain.getHeader()
    if (header.number.toNumber() >= targetBlockNumber) return
    await sleep(1000)
  }
  throw new Error(`Did not reach block ${targetBlockNumber} within ${timeoutMs}ms`)
}

const balanceIncreased = async (
  api: ApiPromise,
  address: string,
  balanceBefore: bigint,
): Promise<boolean> => {
  const currentBalance = await balance(api, address)
  return currentBalance.free > balanceBefore
}

const setupXDM = async (
  consensusApi: ApiPromise,
  domainApi: ApiPromise,
  domainId: number,
  sudoUri: string,
): Promise<void> => {
  console.log('\n📡 Setting up XDM...')

  const sudo = setupWallet({ uri: sudoUri })
  const owner = setupWallet({ uri: sudoUri })

  if (!sudo.keyringPair || !owner.keyringPair) {
    throw new Error('Keyring pairs not initialized')
  }

  const consensusAllowlist = await chainAllowlist(consensusApi)
  const domainInAllowlist = consensusAllowlist.some(
    (entry) => typeof entry !== 'string' && entry.domainId === domainId,
  )

  if (!domainInAllowlist) {
    console.log(`   Adding domain ${domainId} to consensus allowlist...`)
    const allowAddDomain = { Add: { domain: domainId } }
    const callUpdateAllowlist =
      consensusApi.tx.messenger.updateConsensusChainAllowlist(allowAddDomain)
    const sudoWrapped = consensusApi.tx.sudo.sudo(callUpdateAllowlist)
    await signAndSendTx(sudo.keyringPair, sudoWrapped, {}, [], false)
    await waitForBlocks(consensusApi, 1)
  } else {
    console.log(`   ✓ Domain ${domainId} already in allowlist`)
  }

  const domainAllowlist = await chainAllowlist(domainApi)
  const consensusInAllowlist = domainAllowlist.some((entry) => entry === 'consensus')

  if (!consensusInAllowlist) {
    console.log(`   Adding consensus to domain ${domainId} allowlist...`)
    const allowAddConsensus = { Add: { consensus: null } }
    const callInitiateDomainUpdate = consensusApi.tx.messenger.initiateDomainUpdateChainAllowlist(
      domainId,
      allowAddConsensus,
    )
    await signAndSendTx(owner.keyringPair, callInitiateDomainUpdate, {}, [], false)
    await waitForBlocks(consensusApi, 1)
  } else {
    console.log('   ✓ Consensus already in domain allowlist')
  }

  const nextId = await nextChannelId(consensusApi, { domainId })
  const channelExists = nextId > 0n

  if (!channelExists) {
    console.log(`   Initiating channel to domain ${domainId}...`)
    const callInitiateChannel = initiateChannel(consensusApi, { domainId })
    await signAndSendTx(owner.keyringPair, callInitiateChannel, {}, [], false)

    console.log('   Waiting for channel to open...')
    await waitUntil(async () => {
      const channel = await channels(consensusApi, { domainId }, 0n)
      return channel !== null && channel.state === 'Open'
    })
    console.log('   ✓ Channel opened')
  } else {
    console.log(`   ✓ Channel to domain ${domainId} already exists`)
  }

  console.log('   ✅ XDM setup completed\n')
}

const transferConsensusToEvm = async (
  consensusApi: ApiPromise,
  domainApi: ApiPromise,
  senderWallet: ReturnType<typeof setupWallet>,
  evmRecipientAddress: string,
  amount: bigint,
): Promise<void> => {
  console.log('\n💸 Step 1: Consensus → EVM Domain')
  console.log('─'.repeat(50))

  const senderBalanceBefore = await balance(consensusApi, senderWallet.address)
  const receiverBalanceBefore = await balance(domainApi, evmRecipientAddress)

  console.log(`   Sender balance: ${Number(senderBalanceBefore.free) / 1e18} AI3`)
  console.log(`   Receiver balance: ${Number(receiverBalanceBefore.free) / 1e18} AI3`)
  console.log(`   Amount: ${Number(amount) / 1e18} AI3`)

  const tx = transporterTransfer(
    consensusApi,
    { domainId: CONFIG.domainId },
    { accountId20: evmRecipientAddress },
    amount,
  )

  console.log('\n   Sending...')
  await signAndSendTx(senderWallet.keyringPair!, tx)
  console.log('   ✓ Submitted')

  console.log('   Waiting for XDM...')
  await waitUntil(() =>
    balanceIncreased(domainApi, evmRecipientAddress, receiverBalanceBefore.free),
  )

  const senderBalanceAfter = await balance(consensusApi, senderWallet.address)
  const receiverBalanceAfter = await balance(domainApi, evmRecipientAddress)

  console.log(`\n   Sender balance: ${Number(senderBalanceAfter.free) / 1e18} AI3`)
  console.log(`   Receiver balance: ${Number(receiverBalanceAfter.free) / 1e18} AI3`)
  console.log('   ✅ Done\n')
}

const transferEvmToConsensusViaPrecompile = async (
  consensusApi: ApiPromise,
  evmWallet: Wallet,
  consensusRecipientAddress: string,
  amount: bigint,
): Promise<void> => {
  console.log('\n💸 Step 2: EVM Domain → Consensus (via Precompile)')
  console.log('─'.repeat(50))

  const recipientBalanceBefore = await balance(consensusApi, consensusRecipientAddress)
  console.log(`   Recipient balance: ${Number(recipientBalanceBefore.free) / 1e18} AI3`)

  console.log(`\n   Checking precompile at ${TRANSPORTER_PRECOMPILE_ADDRESS}...`)
  const deployed = await isPrecompileDeployed(evmWallet.provider!)
  if (!deployed) {
    throw new Error(`Transporter precompile not found. Requires node version with PR #3714.`)
  }
  console.log('   ✓ Available')

  const minimumAmount = await getMinimumTransferAmount(evmWallet.provider!)
  console.log(`   Minimum: ${Number(minimumAmount) / 1e18} AI3`)

  if (amount < minimumAmount) {
    throw new Error(`Amount ${amount} below minimum ${minimumAmount}`)
  }

  const encodedAccountId32 = encodeAccountId32ToBytes32(consensusRecipientAddress)
  console.log(`\n   Recipient: ${consensusRecipientAddress}`)
  console.log(`   Encoded: ${encodedAccountId32}`)

  const evmBalanceBefore = await evmWallet.provider!.getBalance(evmWallet.address)
  console.log(`   Sender balance: ${Number(evmBalanceBefore) / 1e18} AI3`)
  console.log(`   Amount: ${Number(amount) / 1e18} AI3`)

  console.log('\n   Calling precompile...')
  const result = await transferToConsensus(evmWallet, consensusRecipientAddress, amount)
  console.log(`   Tx: ${result.transactionHash}`)
  console.log(`   ✓ Block ${result.blockNumber}, gas ${result.gasUsed}`)

  console.log('\n   Waiting for XDM...')
  await waitUntil(() =>
    balanceIncreased(consensusApi, consensusRecipientAddress, recipientBalanceBefore.free),
  )

  const recipientBalanceAfter = await balance(consensusApi, consensusRecipientAddress)
  const evmBalanceAfter = await evmWallet.provider!.getBalance(evmWallet.address)

  console.log(`\n   Sender balance: ${Number(evmBalanceAfter) / 1e18} AI3`)
  console.log(`   Recipient balance: ${Number(recipientBalanceAfter.free) / 1e18} AI3`)
  console.log('   ✅ Done\n')
}

const main = async (): Promise<void> => {
  console.log('🚀 Transporter Precompile Round-Trip Example')
  console.log('═'.repeat(50))

  await cryptoWaitReady()

  const senderWallet = CONFIG.consensusSenderMnemonic
    ? setupWallet({ mnemonic: CONFIG.consensusSenderMnemonic })
    : setupWallet({ uri: CONFIG.consensusSenderUri })

  const recipientWallet = CONFIG.consensusRecipientMnemonic
    ? setupWallet({ mnemonic: CONFIG.consensusRecipientMnemonic })
    : setupWallet({ uri: CONFIG.consensusRecipientUri })

  const evmWallet = setupWallet({
    mnemonic: CONFIG.evmMnemonic,
    type: 'ethereum',
  })

  if (!senderWallet.keyringPair || !recipientWallet.keyringPair || !evmWallet.keyringPair) {
    throw new Error('Failed to initialize wallets')
  }

  console.log('\n📋 Wallets:')
  console.log(`   Sender:    ${senderWallet.address}`)
  console.log(`   Recipient: ${recipientWallet.address}`)
  console.log(`   EVM:       ${evmWallet.address}`)

  console.log('\n📡 Connecting...')
  const consensusApi = await createConnection(CONFIG.consensusRpcUrl)
  const domainApi = await createConnection(CONFIG.domainRpcUrl)

  // batchMaxCount: 1 disables batching (Substrate EVM nodes don't support it)
  const evmProvider = CONFIG.evmRpcUrl.startsWith('http')
    ? new JsonRpcProvider(CONFIG.evmRpcUrl, undefined, { batchMaxCount: 1 })
    : new WebSocketProvider(CONFIG.evmRpcUrl)

  let ethersWallet: Wallet
  if (CONFIG.evmPrivateKey) {
    ethersWallet = new Wallet(CONFIG.evmPrivateKey, evmProvider)
  } else {
    const ethersMnemonic = Mnemonic.fromPhrase(CONFIG.evmMnemonic)
    const hdWallet = HDNodeWallet.fromMnemonic(ethersMnemonic, 'm')
    ethersWallet = new Wallet(hdWallet.privateKey, evmProvider)
  }

  console.log('   ✓ Connected')

  try {
    if (!CONFIG.skipXdmSetup) {
      await setupXDM(consensusApi, domainApi, CONFIG.domainId, CONFIG.sudoUri)
    } else {
      console.log('\n📡 Skipping XDM setup')
    }

    await transferConsensusToEvm(
      consensusApi,
      domainApi,
      senderWallet,
      evmWallet.address,
      CONFIG.consensusToEvmAmount,
    )

    await transferEvmToConsensusViaPrecompile(
      consensusApi,
      ethersWallet,
      recipientWallet.address,
      CONFIG.evmToConsensusAmount,
    )

    console.log('═'.repeat(50))
    console.log('✨ Round-trip completed!')
    console.log('═'.repeat(50))
  } finally {
    await consensusApi.disconnect()
    await domainApi.disconnect()
    if (evmProvider instanceof WebSocketProvider) {
      await evmProvider.destroy()
    }
  }
}

main()
  .then(() => {
    console.log('\n✅ Done')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\n❌ Error:', e)
    process.exit(1)
  })
