import { balance } from '@autonomys/auto-consensus'
import {
  createConnection,
  cryptoWaitReady,
  decode,
  setupWallet,
  signAndSendTx,
  type ApiPromise,
} from '@autonomys/auto-utils'
import {
  chainAllowlist,
  channels,
  initiateChannel,
  nextChannelId,
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
  // RPC endpoints
  consensusRpcUrl: process.env.CONSENSUS_RPC_URL || 'ws://127.0.0.1:9944',
  domainRpcUrl: process.env.DOMAIN_RPC_URL || 'ws://127.0.0.1:9945',
  evmRpcUrl: process.env.EVM_RPC_URL || 'http://127.0.0.1:9945',

  // Domain ID (0 = Auto-EVM)
  domainId: 0,

  // Wallet configuration
  // Consensus sender (funds the EVM wallet)
  consensusSenderUri: process.env.CONSENSUS_SENDER_URI || '//Alice',
  consensusSenderMnemonic: process.env.CONSENSUS_SENDER_MNEMONIC,

  // Consensus recipient (receives funds from EVM via precompile)
  consensusRecipientUri: process.env.CONSENSUS_RECIPIENT_URI || '//Bob',
  consensusRecipientMnemonic: process.env.CONSENSUS_RECIPIENT_MNEMONIC,

  // EVM wallet
  evmMnemonic:
    process.env.EVM_MNEMONIC || 'test test test test test test test test test test test junk',
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,

  // Transfer amounts (in AI3, converted to wei)
  consensusToEvmAmount: BigInt(process.env.TRANSFER_TO_EVM_AMOUNT || '10') * 10n ** 18n,
  evmToConsensusAmount: BigInt(process.env.TRANSFER_TO_CONSENSUS_AMOUNT || '5') * 10n ** 18n,

  // XDM setup configuration (for dev networks only)
  // On production networks, XDM is already configured
  skipXdmSetup: process.env.SKIP_XDM_SETUP === 'true',
  sudoUri: process.env.SUDO_URI || '//Alice',
}

// Precompile address: 0x0800 (2048 in decimal)
const TRANSPORTER_PRECOMPILE_ADDRESS = '0x0000000000000000000000000000000000000800'

// ABI for the transporter precompile functions
const TRANSPORTER_PRECOMPILE_ABI = [
  {
    name: 'minimum_transfer_amount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer_to_consensus_v1',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'accountId32', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

// ============================================================================
// Helper Functions
// ============================================================================

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Encodes a Substrate AccountId32 address (SS58 format) to bytes32
 * for use with the transporter precompile.
 */
const encodeAccountId32ToBytes32 = (ss58Address: string): string => {
  const publicKeyBytes = decode(ss58Address)
  return (
    '0x' +
    Array.from(publicKeyBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  )
}

/**
 * Wait until a condition is met
 */
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

/**
 * Wait for N blocks to be produced
 */
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

/**
 * Check if balance has increased
 */
const balanceIncreased = async (
  api: ApiPromise,
  address: string,
  balanceBefore: bigint,
): Promise<boolean> => {
  const currentBalance = await balance(api, address)
  return currentBalance.free > balanceBefore
}

// ============================================================================
// XDM Setup (required for cross-domain messaging)
// ============================================================================

/**
 * Sets up XDM (Cross-Domain Messaging) between consensus and domain.
 * This is required before any cross-domain transfers can occur.
 * On production networks, XDM is already configured - set SKIP_XDM_SETUP=true.
 */
const setupXDM = async (
  consensusApi: ApiPromise,
  domainApi: ApiPromise,
  domainId: number,
  sudoUri: string,
): Promise<void> => {
  console.log('\n📡 Setting up XDM (Cross-Domain Messaging)...')

  const sudo = setupWallet({ uri: sudoUri })
  const owner = setupWallet({ uri: sudoUri })

  if (!sudo.keyringPair || !owner.keyringPair) {
    throw new Error('Keyring pairs not initialized')
  }

  // Step 1: Add domain to consensus allowlist
  const consensusAllowlist = await chainAllowlist(consensusApi)
  const domainInAllowlist = consensusAllowlist.some(
    (entry) => typeof entry !== 'string' && entry.domainId === domainId,
  )

  if (!domainInAllowlist) {
    console.log(`   Step 1/3: Adding domain ${domainId} to consensus allowlist...`)
    const allowAddDomain = { Add: { domain: domainId } }
    const callUpdateAllowlist =
      consensusApi.tx.messenger.updateConsensusChainAllowlist(allowAddDomain)
    const sudoWrapped = consensusApi.tx.sudo.sudo(callUpdateAllowlist)
    await signAndSendTx(sudo.keyringPair, sudoWrapped, {}, [], false)
    await waitForBlocks(consensusApi, 1)
  } else {
    console.log(`   Step 1/3: ✓ Domain ${domainId} already in allowlist`)
  }

  // Step 2: Add consensus to domain allowlist
  const domainAllowlist = await chainAllowlist(domainApi)
  const consensusInAllowlist = domainAllowlist.some((entry) => entry === 'consensus')

  if (!consensusInAllowlist) {
    console.log(`   Step 2/3: Adding consensus to domain ${domainId} allowlist...`)
    const allowAddConsensus = { Add: { consensus: null } }
    const callInitiateDomainUpdate = consensusApi.tx.messenger.initiateDomainUpdateChainAllowlist(
      domainId,
      allowAddConsensus,
    )
    await signAndSendTx(owner.keyringPair, callInitiateDomainUpdate, {}, [], false)
    await waitForBlocks(consensusApi, 1)
  } else {
    console.log('   Step 2/3: ✓ Consensus already in domain allowlist')
  }

  // Step 3: Initialize channel
  const nextId = await nextChannelId(consensusApi, { domainId })
  const channelExists = nextId > 0n

  if (!channelExists) {
    console.log(`   Step 3/3: Initiating channel to domain ${domainId}...`)
    const callInitiateChannel = initiateChannel(consensusApi, { domainId })
    await signAndSendTx(owner.keyringPair, callInitiateChannel, {}, [], false)

    console.log('   Waiting for channel to open...')
    await waitUntil(async () => {
      const channel = await channels(consensusApi, { domainId }, 0n)
      return channel !== null && channel.state === 'Open'
    })
    console.log('   ✓ Channel opened successfully')
  } else {
    console.log(`   Step 3/3: ✓ Channel to domain ${domainId} already exists`)
  }

  console.log('   ✅ XDM setup completed\n')
}

// ============================================================================
// Transfer Functions
// ============================================================================

/**
 * Transfer from Consensus to EVM Domain using SDK transporterTransfer
 */
const transferConsensusToEvm = async (
  consensusApi: ApiPromise,
  domainApi: ApiPromise,
  senderWallet: ReturnType<typeof setupWallet>,
  evmRecipientAddress: string,
  amount: bigint,
): Promise<void> => {
  console.log('\n💸 Step 1: Transfer from Consensus → EVM Domain')
  console.log('─'.repeat(50))

  // Get balances before
  const senderBalanceBefore = await balance(consensusApi, senderWallet.address)
  const receiverBalanceBefore = await balance(domainApi, evmRecipientAddress)

  console.log(`   Sender (Alice) balance: ${Number(senderBalanceBefore.free) / 1e18} AI3`)
  console.log(`   Receiver (EVM) balance: ${Number(receiverBalanceBefore.free) / 1e18} AI3`)
  console.log(`   Transfer amount: ${Number(amount) / 1e18} AI3`)

  // Create and send transfer transaction
  const tx = transporterTransfer(
    consensusApi,
    { domainId: CONFIG.domainId },
    { accountId20: evmRecipientAddress },
    amount,
  )

  console.log('\n   Sending transaction...')
  await signAndSendTx(senderWallet.keyringPair!, tx)
  console.log('   ✓ Transaction submitted')

  // Wait for funds to arrive on domain
  console.log('   Waiting for XDM to process...')
  await waitUntil(() =>
    balanceIncreased(domainApi, evmRecipientAddress, receiverBalanceBefore.free),
  )

  // Verify final balances
  const senderBalanceAfter = await balance(consensusApi, senderWallet.address)
  const receiverBalanceAfter = await balance(domainApi, evmRecipientAddress)

  console.log('\n   Final balances:')
  console.log(`   Sender (Alice) balance: ${Number(senderBalanceAfter.free) / 1e18} AI3`)
  console.log(`   Receiver (EVM) balance: ${Number(receiverBalanceAfter.free) / 1e18} AI3`)
  console.log('   ✅ Transfer to EVM domain completed!\n')
}

/**
 * Transfer from EVM Domain to Consensus using the Transporter Precompile
 */
const transferEvmToConsensusViaPrecompile = async (
  consensusApi: ApiPromise,
  evmWallet: Wallet,
  consensusRecipientAddress: string,
  amount: bigint,
): Promise<void> => {
  console.log('\n💸 Step 2: Transfer from EVM Domain → Consensus (via Precompile)')
  console.log('─'.repeat(50))

  // Get consensus balance before
  const recipientBalanceBefore = await balance(consensusApi, consensusRecipientAddress)
  console.log(
    `   Recipient (Bob) consensus balance: ${Number(recipientBalanceBefore.free) / 1e18} AI3`,
  )

  // Check if precompile exists at the expected address
  console.log(`\n   Checking precompile at ${TRANSPORTER_PRECOMPILE_ADDRESS}...`)
  const code = await evmWallet.provider!.getCode(TRANSPORTER_PRECOMPILE_ADDRESS)
  console.log(`   Precompile code: ${code}`)
  if (code === '0x' || code === '0x0' || !code) {
    console.log('   ⚠️  WARNING: No code at precompile address!')
    console.log('   The transporter precompile may not be deployed on this node version.')
    console.log('   Make sure you are using a node version that includes PR #3714.')
    throw new Error(
      `Transporter precompile not found at ${TRANSPORTER_PRECOMPILE_ADDRESS}. ` +
        'This feature requires a node version with the transporter precompile deployed.',
    )
  }

  // Create contract instance for the precompile
  const transporterPrecompile = new Contract(
    TRANSPORTER_PRECOMPILE_ADDRESS,
    TRANSPORTER_PRECOMPILE_ABI,
    evmWallet,
  )

  // Query minimum transfer amount
  console.log('\n   Querying minimum transfer amount...')
  const minimumAmount = await transporterPrecompile.minimum_transfer_amount()
  console.log(`   Minimum: ${Number(minimumAmount) / 1e18} AI3`)

  if (amount < minimumAmount) {
    throw new Error(`Transfer amount ${amount} is below minimum ${minimumAmount.toString()}`)
  }

  // Encode recipient address
  const encodedAccountId32 = encodeAccountId32ToBytes32(consensusRecipientAddress)
  console.log(`\n   Recipient SS58: ${consensusRecipientAddress}`)
  console.log(`   Encoded bytes32: ${encodedAccountId32}`)

  // Get EVM balance before
  const evmBalanceBefore = await evmWallet.provider!.getBalance(evmWallet.address)
  console.log(`   Sender (EVM) balance: ${Number(evmBalanceBefore) / 1e18} AI3`)
  console.log(`   Transfer amount: ${Number(amount) / 1e18} AI3`)

  // Execute precompile call
  console.log('\n   Calling transporter precompile...')
  const tx = await transporterPrecompile.transfer_to_consensus_v1(encodedAccountId32, amount)
  console.log(`   Transaction hash: ${tx.hash}`)
  console.log('   Waiting for confirmation...')

  const receipt = await tx.wait()
  console.log(`   ✓ Confirmed in block ${receipt.blockNumber}`)
  console.log(`   Gas used: ${receipt.gasUsed.toString()}`)

  // Wait for XDM to process and funds to arrive on consensus
  console.log('\n   Waiting for XDM to process...')
  await waitUntil(() =>
    balanceIncreased(consensusApi, consensusRecipientAddress, recipientBalanceBefore.free),
  )

  // Verify final balances
  const recipientBalanceAfter = await balance(consensusApi, consensusRecipientAddress)
  const evmBalanceAfter = await evmWallet.provider!.getBalance(evmWallet.address)

  console.log('\n   Final balances:')
  console.log(`   Sender (EVM) balance: ${Number(evmBalanceAfter) / 1e18} AI3`)
  console.log(
    `   Recipient (Bob) consensus balance: ${Number(recipientBalanceAfter.free) / 1e18} AI3`,
  )
  console.log('   ✅ Transfer to consensus completed!\n')
}

// ============================================================================
// Main
// ============================================================================

const main = async (): Promise<void> => {
  console.log('🚀 Transporter Precompile Round-Trip Example')
  console.log('═'.repeat(50))
  console.log('This example demonstrates:')
  console.log('1. Consensus → EVM Domain transfer (SDK transporterTransfer)')
  console.log('2. EVM Domain → Consensus transfer (Transporter Precompile)')
  console.log('═'.repeat(50))

  // Initialize WASM crypto
  await cryptoWaitReady()

  // Setup consensus sender wallet (funds the EVM wallet)
  const senderWallet = CONFIG.consensusSenderMnemonic
    ? setupWallet({ mnemonic: CONFIG.consensusSenderMnemonic })
    : setupWallet({ uri: CONFIG.consensusSenderUri })

  // Setup consensus recipient wallet (receives funds from EVM)
  const recipientWallet = CONFIG.consensusRecipientMnemonic
    ? setupWallet({ mnemonic: CONFIG.consensusRecipientMnemonic })
    : setupWallet({ uri: CONFIG.consensusRecipientUri })

  // Setup EVM wallet (using SDK for address derivation)
  const evmWallet = setupWallet({
    mnemonic: CONFIG.evmMnemonic,
    type: 'ethereum',
  })

  if (!senderWallet.keyringPair || !recipientWallet.keyringPair || !evmWallet.keyringPair) {
    throw new Error('Failed to initialize wallets')
  }

  console.log('\n📋 Wallet Addresses:')
  console.log(`   Sender (Consensus):    ${senderWallet.address}`)
  console.log(`   Recipient (Consensus): ${recipientWallet.address}`)
  console.log(`   EVM Wallet:            ${evmWallet.address}`)

  // Connect to chains
  console.log('\n📡 Connecting to chains...')
  console.log(`   Consensus: ${CONFIG.consensusRpcUrl}`)
  console.log(`   Domain:    ${CONFIG.domainRpcUrl}`)

  const consensusApi = await createConnection(CONFIG.consensusRpcUrl)
  const domainApi = await createConnection(CONFIG.domainRpcUrl)

  // Setup EVM provider and wallet for ethers.js
  // Note: batchMaxCount: 1 disables batching (Substrate EVM nodes don't support batched requests)
  const evmProvider = CONFIG.evmRpcUrl.startsWith('http')
    ? new JsonRpcProvider(CONFIG.evmRpcUrl, undefined, { batchMaxCount: 1 })
    : new WebSocketProvider(CONFIG.evmRpcUrl)

  // Create ethers wallet - use private key if provided, otherwise derive from mnemonic
  let ethersWallet: Wallet
  if (CONFIG.evmPrivateKey) {
    ethersWallet = new Wallet(CONFIG.evmPrivateKey, evmProvider)
  } else {
    // SDK uses master key (m) derivation by default for ethereum type wallets
    const ethersMnemonic = Mnemonic.fromPhrase(CONFIG.evmMnemonic)
    const hdWallet = HDNodeWallet.fromMnemonic(ethersMnemonic, 'm')
    ethersWallet = new Wallet(hdWallet.privateKey, evmProvider)
  }

  console.log(`   ✓ Connected to both chains`)
  console.log(`   EVM wallet ethers address: ${ethersWallet.address}`)

  try {
    // Setup XDM (required for cross-domain transfers)
    // Skip on production networks where XDM is already configured
    if (!CONFIG.skipXdmSetup) {
      await setupXDM(consensusApi, domainApi, CONFIG.domainId, CONFIG.sudoUri)
    } else {
      console.log('\n📡 Skipping XDM setup (SKIP_XDM_SETUP=true)')
    }

    // Step 1: Transfer from Consensus to EVM Domain
    await transferConsensusToEvm(
      consensusApi,
      domainApi,
      senderWallet,
      evmWallet.address,
      CONFIG.consensusToEvmAmount,
    )

    // Step 2: Transfer from EVM Domain to Consensus via Precompile
    await transferEvmToConsensusViaPrecompile(
      consensusApi,
      ethersWallet,
      recipientWallet.address,
      CONFIG.evmToConsensusAmount,
    )

    console.log('═'.repeat(50))
    console.log('✨ Round-trip transfer completed successfully!')
    console.log('═'.repeat(50))
  } finally {
    // Cleanup
    await consensusApi.disconnect()
    await domainApi.disconnect()
    if (evmProvider instanceof WebSocketProvider) {
      await evmProvider.destroy()
    }
  }
}

// Run the example
main()
  .then(() => {
    console.log('\n✅ Example completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Example failed:', error)
    process.exit(1)
  })
