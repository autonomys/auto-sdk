#!/usr/bin/env tsx

/**
 * Staking Position Calculator
 *
 * Calculates staking positions for a given operator and account combination.
 * Now uses the @autonomys/auto-consensus SDK functions.
 *
 * Usage:
 *   npx tsx staking-position-calculator.ts <operatorId> <accountId> [rpcUrl]
 *
 * Example:
 *   npx tsx staking-position-calculator.ts 0 sudsmzacWHtCn8rhPixDqBWxYqPWCxV7E9DxrfZafitKEXkf1
 */

import type { NominatorPosition } from '@autonomys/auto-consensus'
import {
  deposits,
  domainStakingSummary,
  instantSharePrice,
  nominatorPosition,
  operatorEpochSharePrice,
  shareToStake,
  withdrawals,
} from '@autonomys/auto-consensus'
import { ApiPromise, WsProvider } from '@polkadot/api'

// Constants
const STAKE_EPOCH_DURATION = 100 // From subspace-runtime
const DEFAULT_RPC_URL = 'wss://rpc-0.taurus.subspace.network/ws'

interface CalculationResult {
  currentKnownValue: number
  pendingDepositValue: number
  totalValueAfterEpochTransition: number
  knownStorageFeeDeposit: number
  pendingStorageFeeDeposit: number
  totalStorageFeeDeposit: number
  totalEconomicExposure: number
  currentEpoch: number
  sharePrice: number
  status: {
    hasPendingDeposits: boolean
    hasPendingWithdrawals: boolean
    epochTransitionPending: boolean
  }
}

/**
 * Parse balance from bigint (18 decimals) to number representation
 */
const parseBalance = (balance: bigint): number => {
  const divisor = BigInt('1000000000000000000') // 10^18
  return Number(balance) / Number(divisor)
}

/**
 * Parse shares from bigint to number representation
 * Shares are dimensionless units, but still use 18 decimal places for precision
 */
const parseShares = (shares: bigint): number => {
  const divisor = BigInt('1000000000000000000') // 10^18
  return Number(shares) / Number(divisor)
}

/**
 * Parse Perbill format (parts per billion) to decimal
 */
const parsePerbill = (perbill: bigint): number => {
  const divisor = BigInt(10 ** 18) // 10^18 for Perbill
  return Number(perbill) / Number(divisor)
}

/**
 * Format balance for display
 */
const formatBalance = (balance: bigint): string => {
  const balanceNum = parseBalance(balance)
  return `${balanceNum.toFixed(6)} tokens`
}

/**
 * Format shares for display
 */
const formatShares = (shares: bigint): string => {
  const sharesNum = parseShares(shares)
  return `${sharesNum.toFixed(6)} shares`
}

/**
 * Get current domain epoch from domain staking summary
 */
const getCurrentDomainEpoch = async (api: ApiPromise, domainId: number): Promise<number> => {
  try {
    const stakingSummaries = await domainStakingSummary(api)
    const summary = stakingSummaries.find((s) => s.domainId === domainId.toString())

    if (!summary) {
      throw new Error(`No staking summary found for domain ${domainId}`)
    }

    return summary.currentEpochIndex
  } catch (error) {
    console.error(`Error querying domain staking summary:`, error)
    throw new Error(`Unable to determine current domain epoch`)
  }
}

/**
 * Calculate all position values from SDK position data
 */
const calculateValues = (
  positionData: NominatorPosition,
  sharePrice: number,
  currentEpoch: number,
): CalculationResult => {
  // Parse known values
  const currentKnownValue = parseBalance(positionData.knownValue)
  const knownStorageFeeDeposit = parseBalance(positionData.storageFeeDeposit)

  // Parse pending values
  let pendingDepositValue = 0
  let pendingStorageFeeDeposit = 0
  let epochTransitionPending = false

  if (positionData.pendingDeposits.length > 0) {
    // Sum up all pending deposits
    pendingDepositValue = positionData.pendingDeposits.reduce(
      (sum, deposit) => sum + parseBalance(deposit.amount),
      0,
    )

    // Check if any deposits are still pending
    epochTransitionPending = positionData.pendingDeposits.some(
      (deposit) => deposit.effectiveEpoch > currentEpoch,
    )
  }

  // Calculate totals
  const totalValueAfterEpochTransition = currentKnownValue + pendingDepositValue
  const totalStorageFeeDeposit = knownStorageFeeDeposit + pendingStorageFeeDeposit
  const totalEconomicExposure = totalValueAfterEpochTransition + totalStorageFeeDeposit

  return {
    currentKnownValue,
    pendingDepositValue,
    totalValueAfterEpochTransition,
    knownStorageFeeDeposit,
    pendingStorageFeeDeposit,
    totalStorageFeeDeposit,
    totalEconomicExposure,
    currentEpoch,
    sharePrice,
    status: {
      hasPendingDeposits: positionData.pendingDeposits.length > 0,
      hasPendingWithdrawals: positionData.pendingWithdrawals.length > 0,
      epochTransitionPending,
    },
  }
}

/**
 * Print detailed results
 */
const printResults = (result: CalculationResult): void => {
  console.log(`\n🎯 STAKING POSITION SUMMARY`)
  console.log(`================================`)

  console.log(`\n📈 Current Position:`)
  console.log(`   Known Position Value: ${result.currentKnownValue.toFixed(6)} tokens`)
  console.log(`   Share Price: ${result.sharePrice.toFixed(6)}`)
  console.log(`   Current Epoch: ${result.currentEpoch}`)

  if (result.status.hasPendingDeposits) {
    console.log(`\n⏳ Pending Deposits:`)
    console.log(`   Pending Amount: ${result.pendingDepositValue.toFixed(6)} tokens`)
    console.log(
      `   Status: ${result.status.epochTransitionPending ? 'Will activate next epoch' : 'Ready to activate'}`,
    )
    console.log(
      `   Total After Transition: ${result.totalValueAfterEpochTransition.toFixed(6)} tokens`,
    )
  } else {
    console.log(`\n✅ No pending deposits`)
  }

  console.log(`\n🏦 Storage Fee Deposits:`)
  console.log(`   Known Storage Fee Deposit: ${result.knownStorageFeeDeposit.toFixed(6)} tokens`)
  if (result.pendingStorageFeeDeposit > 0) {
    console.log(
      `   Pending Storage Fee Deposit: ${result.pendingStorageFeeDeposit.toFixed(6)} tokens`,
    )
  }
  console.log(`   Total Storage Fee Deposit: ${result.totalStorageFeeDeposit.toFixed(6)} tokens`)
  console.log(`   Note: Subject to storage fund performance`)

  if (result.status.hasPendingWithdrawals) {
    console.log(`\n📤 Pending Withdrawals: Yes`)
  } else {
    console.log(`\n✅ No pending withdrawals`)
  }

  console.log(`\n💰 TOTAL ECONOMIC EXPOSURE`)
  console.log(`   Staking Position: ${result.totalValueAfterEpochTransition.toFixed(6)} tokens`)
  console.log(`   Storage Fund Position: ${result.totalStorageFeeDeposit.toFixed(6)} tokens`)
  console.log(`   TOTAL: ${result.totalEconomicExposure.toFixed(6)} tokens`)

  console.log(`\n📝 Notes:`)
  console.log(`   • Staking positions use share-based accounting`)
  console.log(`   • Storage fund deposits are subject to fund performance`)
  console.log(`   • Epoch duration: ${STAKE_EPOCH_DURATION} domain blocks`)
  if (result.sharePrice === 1.0) {
    console.log(`   • Share price 1.0 indicates no rewards/slashing since deposit`)
  } else if (result.sharePrice > 1.0) {
    console.log(`   • Share price > 1.0 indicates rewards have been earned`)
  } else {
    console.log(`   • Share price < 1.0 indicates slashing has occurred`)
  }
}

/**
 * Calculate staking position for a given operator and account using SDK functions
 */
const calculatePosition = async (
  api: ApiPromise,
  operatorId: number,
  accountId: string,
): Promise<CalculationResult> => {
  console.log(`\n🔍 Calculating staking position for:`)
  console.log(`   Operator ID: ${operatorId}`)
  console.log(`   Account ID: ${accountId}`)
  console.log(`   RPC: ${api.runtimeVersion.specName}`)

  // Step 1: Get complete position using SDK
  console.log(`\n📊 Step 1: Getting nominator position using SDK...`)
  const positionData = await nominatorPosition(api, operatorId, accountId)

  console.log(`   Known value: ${formatBalance(positionData.knownValue)}`)
  console.log(`   Pending deposits: ${positionData.pendingDeposits.length}`)
  console.log(`   Pending withdrawals: ${positionData.pendingWithdrawals.length}`)
  console.log(`   Storage fee deposit: ${formatBalance(positionData.storageFeeDeposit)}`)

  // Show detailed withdrawal information if any
  if (positionData.pendingWithdrawals.length > 0) {
    console.log(`\n   📤 Detailed Pending Withdrawals:`)
    positionData.pendingWithdrawals.forEach((withdrawal, i) => {
      console.log(`      ${i + 1}. Amount: ${formatBalance(withdrawal.amount)}`)
      console.log(`         Unlock at block: ${withdrawal.unlockAtDomainBlock}`)
      console.log(`         Storage fee refund: ${formatBalance(withdrawal.storageFeeRefund)}`)
    })
  }

  // Step 2: Get current domain epoch
  console.log(`\n📊 Step 2: Getting current domain epoch...`)
  const currentEpoch = await getCurrentDomainEpoch(api, 0) // Domain 0
  console.log(`   Current domain epoch: ${currentEpoch}`)

  // Step 3: Get instant share price
  console.log(`\n📊 Step 3: Getting instant share price...`)
  const sharePriceBigInt = await instantSharePrice(api, operatorId)
  const sharePrice = parsePerbill(sharePriceBigInt)
  console.log(
    `   Share price: ${sharePrice} (${sharePrice === 1.0 ? 'no rewards/slashing' : sharePrice > 1.0 ? 'rewards earned' : 'slashing occurred'})`,
  )

  // Step 4: Calculate final result
  console.log(`\n📊 Step 4: Calculating position values...`)
  const result = calculateValues(positionData, sharePrice, currentEpoch)

  return result
}

/**
 * Demonstrate individual SDK functions
 */
const demonstrateSDKFunctions = async (
  api: ApiPromise,
  operatorId: number,
  accountId: string,
  domainId: number = 0,
): Promise<void> => {
  console.log(`\n🔬 DEMONSTRATING SDK FUNCTIONS`)
  console.log(`=====================================`)

  try {
    // Demonstrate deposits query
    console.log(`\n📊 Testing deposits() function:`)
    const depositsData = await deposits(api, operatorId, accountId)
    if (depositsData.length > 0) {
      const deposit = depositsData[0]
      console.log(`   Known shares: ${formatShares(deposit.known.shares)}`)
      console.log(`   Known storage fee: ${formatBalance(deposit.known.storageFeeDeposit)}`)
      if (deposit.pending) {
        console.log(`   Pending amount: ${formatBalance(deposit.pending.amount)}`)
        console.log(`   Pending effective epoch: ${deposit.pending.effectiveDomainEpoch}`)
      }
    } else {
      console.log(`   No deposits found`)
    }

    // Demonstrate withdrawals query
    console.log(`\n📊 Testing withdrawals() function:`)
    const withdrawalsData = await withdrawals(api, operatorId, accountId)
    if (withdrawalsData.length > 0) {
      console.log(`   Found ${withdrawalsData.length} withdrawal(s)`)
      withdrawalsData.forEach((withdrawal, i) => {
        console.log(`\n   📤 Withdrawal ${i + 1} Details:`)
        console.log(`      Operator ID: ${withdrawal.operatorId}`)
        console.log(`      Account: ${withdrawal.account}`)
        console.log(
          `      Total Withdrawal Amount: ${formatBalance(withdrawal.totalWithdrawalAmount)}`,
        )

        // Show regular withdrawals
        if (withdrawal.withdrawals && withdrawal.withdrawals.length > 0) {
          console.log(`      Regular Withdrawals (${withdrawal.withdrawals.length}):`)
          withdrawal.withdrawals.forEach((w, j) => {
            console.log(`        ${j + 1}. Amount: ${formatBalance(w.amountToUnlock)}`)
            console.log(`           Domain ID: ${w.domainId}`)
            console.log(`           Unlock at block: ${w.unlockAtConfirmedDomainBlockNumber}`)
            console.log(`           Storage fee refund: ${formatBalance(w.storageFeeRefund)}`)
          })
        } else {
          console.log(`      Regular Withdrawals: None`)
        }

        // Show withdrawal in shares
        if (withdrawal.withdrawalInShares) {
          console.log(`      Withdrawal in Shares:`)
          console.log(
            `        Domain Epoch: [${withdrawal.withdrawalInShares.domainEpoch.join(', ')}]`,
          )
          console.log(`        Shares: ${formatShares(withdrawal.withdrawalInShares.shares)}`)
          console.log(
            `        Unlock at block: ${withdrawal.withdrawalInShares.unlockAtConfirmedDomainBlockNumber}`,
          )
          console.log(
            `        Storage fee refund: ${formatBalance(withdrawal.withdrawalInShares.storageFeeRefund)}`,
          )
        } else {
          console.log(`      Withdrawal in Shares: None`)
        }

        console.log(`\n      📋 Full Withdrawal Object:`)
        console.log(
          `      ${JSON.stringify(
            withdrawal,
            (key, value) => (typeof value === 'bigint' ? value.toString() : value),
            2,
          )}`,
        )
      })
    } else {
      console.log(`   No pending withdrawals`)
    }

    // Demonstrate instant share price
    console.log(`\n📊 Testing instantSharePrice() function:`)
    const instantPrice = await instantSharePrice(api, operatorId)
    console.log(`   Instant share price: ${parsePerbill(instantPrice)}`)

    // Demonstrate epoch share price
    console.log(`\n📊 Testing operatorEpochSharePrice() function:`)
    const currentEpoch = await getCurrentDomainEpoch(api, domainId)
    const epochPrice = await operatorEpochSharePrice(api, operatorId, currentEpoch, domainId)
    if (epochPrice !== undefined) {
      console.log(`   Epoch ${currentEpoch} share price: ${parsePerbill(epochPrice)}`)
    } else {
      console.log(`   No share price stored for epoch ${currentEpoch}`)
    }

    // Demonstrate share/stake conversion
    console.log(`\n📊 Testing share/stake conversion functions:`)
    const testShares = BigInt('1000000000000000000000') // 1000 shares
    const testPrice = BigInt('1100000000000000000') // 1.1 price
    const convertedStake = shareToStake(testShares, testPrice)
    console.log(
      `   ${formatShares(testShares)} at price ${parsePerbill(testPrice)} = ${formatBalance(convertedStake)}`,
    )
  } catch (error) {
    console.error(`   Error demonstrating SDK functions:`, error)
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error(`Usage: npx tsx staking-position-calculator.ts <operatorId> <accountId> [rpcUrl]`)
    console.error(
      `Example: npx tsx staking-position-calculator.ts 0 sudsmzacWHtCn8rhPixDqBWxYqPWCxV7E9DxrfZafitKEXkf1`,
    )
    process.exit(1)
  }

  const operatorId = parseInt(args[0])
  const accountId = args[1]
  const rpcUrl = args[2] || DEFAULT_RPC_URL

  if (isNaN(operatorId)) {
    console.error(`Invalid operator ID: ${args[0]}`)
    process.exit(1)
  }

  console.log(`🚀 Connecting to ${rpcUrl}...`)

  try {
    const provider = new WsProvider(rpcUrl)
    const api = await ApiPromise.create({ provider })

    console.log(`✅ Connected to ${api.runtimeVersion.specName} v${api.runtimeVersion.specVersion}`)

    // Demonstrate individual SDK functions
    await demonstrateSDKFunctions(api, operatorId, accountId)

    // Calculate complete position
    const result = await calculatePosition(api, operatorId, accountId)

    printResults(result)

    await api.disconnect()
  } catch (error) {
    console.error(`❌ Error:`, error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export {
  calculatePosition,
  formatBalance,
  formatShares,
  parseBalance,
  parsePerbill,
  parseShares,
  printResults,
}
