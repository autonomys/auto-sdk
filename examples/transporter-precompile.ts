import { balance } from '@autonomys/auto-consensus'
import { createConnection, cryptoWaitReady, setupWallet } from '@autonomys/auto-utils'
import {
  getMinimumTransferAmount,
  isPrecompileDeployed,
  transferToConsensus,
  TRANSPORTER_PRECOMPILE_ADDRESS,
} from '@autonomys/auto-xdm'
import 'dotenv/config'
import { HDNodeWallet, JsonRpcProvider, Mnemonic, Wallet } from 'ethers'

// Configuration via environment variables
// See .env.example for all options
const CONFIG = {
  consensusRpcUrl: process.env.CONSENSUS_RPC_URL || 'wss://rpc.chronos.autonomys.xyz/ws',
  evmRpcUrl: process.env.EVM_RPC_URL || 'https://auto-evm.chronos.autonomys.xyz/ws',
  evmMnemonic: process.env.EVM_MNEMONIC,
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
  recipientAddress: process.env.RECIPIENT_ADDRESS,
  transferAmount: BigInt(process.env.TRANSFER_AMOUNT || '1') * 10n ** 18n,
}

const main = async () => {
  console.log('🚀 Transporter Precompile Example')
  console.log('═'.repeat(50))
  console.log('Transfer from EVM Domain → Consensus Chain')
  console.log('═'.repeat(50))

  // Validate required config
  if (!CONFIG.evmMnemonic && !CONFIG.evmPrivateKey) {
    console.error('❌ Set EVM_MNEMONIC or EVM_PRIVATE_KEY in .env')
    process.exit(1)
  }
  if (!CONFIG.recipientAddress) {
    console.error('❌ Set RECIPIENT_ADDRESS (SS58 format) in .env')
    process.exit(1)
  }

  await cryptoWaitReady()

  // Setup EVM wallet
  const evmProvider = new JsonRpcProvider(CONFIG.evmRpcUrl, undefined)

  let evmWallet: Wallet
  if (CONFIG.evmPrivateKey) {
    evmWallet = new Wallet(CONFIG.evmPrivateKey, evmProvider)
  } else {
    const mnemonic = Mnemonic.fromPhrase(CONFIG.evmMnemonic!)
    const hdWallet = HDNodeWallet.fromMnemonic(mnemonic, 'm')
    evmWallet = new Wallet(hdWallet.privateKey, evmProvider)
  }

  // Setup consensus connection for balance checks
  const consensusApi = await createConnection(CONFIG.consensusRpcUrl)

  console.log('\n📋 Configuration:')
  console.log(`   EVM Sender:    ${evmWallet.address}`)
  console.log(`   Recipient:     ${CONFIG.recipientAddress}`)
  console.log(`   Amount:        ${Number(CONFIG.transferAmount) / 1e18} AI3`)
  console.log(`   EVM RPC:       ${CONFIG.evmRpcUrl}`)
  console.log(`   Consensus RPC: ${CONFIG.consensusRpcUrl}`)

  try {
    // Check precompile availability
    console.log(`\n🔍 Checking precompile at ${TRANSPORTER_PRECOMPILE_ADDRESS}...`)
    const deployed = await isPrecompileDeployed(evmProvider)
    if (!deployed) {
      throw new Error(
        'Precompile not available on this network. ' +
          'The transporter precompile is currently available on Chronos testnet and local dev nodes. ' +
          'Mainnet support coming soon.',
      )
    }
    console.log('   ✓ Precompile available')

    // Check minimum amount
    const minAmount = await getMinimumTransferAmount(evmProvider)
    console.log(`   Minimum transfer: ${Number(minAmount) / 1e18} AI3`)

    if (CONFIG.transferAmount < minAmount) {
      throw new Error(`Amount below minimum (${Number(minAmount) / 1e18} AI3)`)
    }

    // Check balances before
    const evmBalanceBefore = await evmProvider.getBalance(evmWallet.address)
    const recipientBalanceBefore = await balance(consensusApi, CONFIG.recipientAddress)

    console.log('\n💰 Balances before:')
    console.log(`   EVM Sender:  ${Number(evmBalanceBefore) / 1e18} AI3`)
    console.log(`   Recipient:   ${Number(recipientBalanceBefore.free) / 1e18} AI3`)

    if (evmBalanceBefore < CONFIG.transferAmount) {
      throw new Error('Insufficient EVM balance')
    }

    // Execute transfer
    console.log('\n📤 Sending transfer...')
    const result = await transferToConsensus(
      evmWallet,
      CONFIG.recipientAddress,
      CONFIG.transferAmount,
    )

    console.log(`   ✓ Tx hash: ${result.transactionHash}`)
    console.log(`   ✓ Block:   ${result.blockNumber}`)
    console.log(`   ✓ Gas:     ${result.gasUsed}`)

    // Check balances after (EVM side only - consensus takes time via XDM)
    const evmBalanceAfter = await evmProvider.getBalance(evmWallet.address)
    console.log('\n💰 EVM balance after:')
    console.log(`   EVM Sender: ${Number(evmBalanceAfter) / 1e18} AI3`)

    console.log('═'.repeat(50))
    console.log('✨ Transfer submitted!')
    console.log('   Funds will arrive on consensus after XDM processing')
    console.log('═'.repeat(50))
  } finally {
    await consensusApi.disconnect()
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('\n❌ Error:', e.message || e)
    process.exit(1)
  })
