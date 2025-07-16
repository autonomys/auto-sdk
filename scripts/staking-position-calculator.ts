#!/usr/bin/env tsx

/**
 * Nominator Position Viewer
 *
 * Displays staking position details for a given operator and nominator combination.
 * Uses the new runtime API for accurate and up-to-date position information.
 *
 * Usage:
 *   npx tsx staking-position-calculator.ts <operatorId> <nominatorAccount> [networkId]
 *
 * Example:
 *   npx tsx staking-position-calculator.ts 0 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY taurus
 */

import { nominatorPosition } from '@autonomys/auto-consensus'
import { activate } from '@autonomys/auto-utils'

// Constants
const DEFAULT_NETWORK_ID = 'taurus'

/**
 * Format balance from bigint (18 decimals) to readable string
 */
const formatBalance = (balance: bigint): string => {
  const divisor = BigInt('1000000000000000000') // 10^18
  const tokens = Number(balance) / Number(divisor)
  return `${tokens.toFixed(6)} AI3`
}

/**
 * Display nominator position details
 */
const displayPosition = async (
  operatorId: string,
  nominatorAccount: string,
  networkId: string = DEFAULT_NETWORK_ID,
): Promise<void> => {
  console.log(`🔍 Fetching nominator position...`)
  console.log(`   Operator ID: ${operatorId}`)
  console.log(`   Nominator: ${nominatorAccount}`)
  console.log(`   Network: ${networkId}`)

  try {
    // Connect to the network
    const api = await activate({ networkId })
    console.log(`✅ Connected to ${api.runtimeVersion.specName} v${api.runtimeVersion.specVersion}`)

    // Get position using the runtime API
    const position = await nominatorPosition(api, operatorId, nominatorAccount)

    console.log(`\n📊 NOMINATOR POSITION DETAILS`)
    console.log(`================================`)

    // Current staked value
    console.log(`\n💰 Staking Position:`)
    console.log(`   Current Staked Value: ${formatBalance(position.currentStakedValue)}`)
    console.log(`   Total Shares: ${position.totalShares.toString()}`)

    // Storage fee deposits
    console.log(`\n🏦 Storage Fee Deposits:`)
    console.log(`   Total Deposited: ${formatBalance(position.storageFeeDeposit.totalDeposited)}`)
    console.log(`   Current Value: ${formatBalance(position.storageFeeDeposit.currentValue)}`)

    const storageDiff =
      position.storageFeeDeposit.currentValue - position.storageFeeDeposit.totalDeposited
    if (storageDiff > 0) {
      console.log(`   📈 Gain: +${formatBalance(storageDiff)}`)
    } else if (storageDiff < 0) {
      console.log(`   📉 Loss: ${formatBalance(storageDiff)}`)
    } else {
      console.log(`   ➡️ No change`)
    }

    // Pending deposit
    console.log(`\n⏳ Pending Deposit:`)
    if (position.pendingDeposit) {
      console.log(`   Amount: ${formatBalance(position.pendingDeposit.amount)}`)
      console.log(`   Effective Epoch: ${position.pendingDeposit.effectiveEpoch}`)
    } else {
      console.log(`   None`)
    }

    // Pending withdrawals
    console.log(`\n📤 Pending Withdrawals:`)
    if (position.pendingWithdrawals.length > 0) {
      position.pendingWithdrawals.forEach((withdrawal, i) => {
        console.log(`   ${i + 1}. Stake Amount: ${formatBalance(withdrawal.stakeWithdrawalAmount)}`)
        console.log(`      Storage Fee Refund: ${formatBalance(withdrawal.storageFeeRefund)}`)
        console.log(`      Unlock at Block: ${withdrawal.unlockAtBlock}`)
      })
    } else {
      console.log(`   None`)
    }

    // Total economic exposure
    const totalExposure = position.currentStakedValue + position.storageFeeDeposit.currentValue
    const pendingAmount = position.pendingDeposit?.amount || BigInt(0)
    const totalAfterPending = totalExposure + pendingAmount

    console.log(`\n💼 Economic Exposure:`)
    console.log(`   Current Total: ${formatBalance(totalExposure)}`)
    if (pendingAmount > 0) {
      console.log(`   After Pending Deposit: ${formatBalance(totalAfterPending)}`)
    }

    await api.disconnect()
    console.log(`\n✅ Complete`)
  } catch (error) {
    console.error(`❌ Error:`, error)
    process.exit(1)
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error(
      `Usage: npx tsx staking-position-calculator.ts <operatorId> <nominatorAccount> [networkId]`,
    )
    console.error(
      `Example: npx tsx staking-position-calculator.ts 0 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY taurus`,
    )
    console.error(`Available networks: taurus, mainnet`)
    process.exit(1)
  }

  const operatorId = args[0]
  const nominatorAccount = args[1]
  const networkId = args[2] || DEFAULT_NETWORK_ID

  await displayPosition(operatorId, nominatorAccount, networkId)
}

if (require.main === module) {
  main().catch(console.error)
}
