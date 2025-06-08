import type {
  Deposit,
  DomainStakingSummary,
  Operator,
  Withdrawal,
  WithdrawalUnlock,
} from '@autonomys/auto-consensus'

// All calculations are done using BigInt to handle large numbers and avoid precision loss.
// The base unit (e.g., Planck for DOT, Wei for ETH) is used throughout. 1 token = 1 * 10^18 base units.

// Constants for calculations
const ONE_TRILLION = BigInt(1_000_000_000_000) // For nomination tax (parts per trillion)
const PRECISION_18 = BigInt(10 ** 18) // 10^18 for token precision

/**
 * Calculates the instant share price for an operator.
 * This price reflects the current value of one share, including rewards from the current epoch.
 * @param operator The operator's data.
 * @param domainStakingSummary The staking summary for the operator's domain.
 * @returns The instant share price as a BigInt (scaled by 10^18 for precision).
 */
export const calculateInstantSharePrice = (
  operator: Operator,
  domainStakingSummary: DomainStakingSummary,
): bigint => {
  const operatorIdStr = String(operator.operatorId)
  const rewardStr = domainStakingSummary.currentEpochRewards[operatorIdStr]

  const reward = rewardStr ? BigInt(rewardStr) : BigInt(0)
  const nominationTax = BigInt(Number(operator.operatorDetails.nominationTax))
  const taxedReward = reward - (reward * nominationTax) / ONE_TRILLION

  const currentTotalStake = operator.operatorDetails.currentTotalStake
  const currentTotalShares = operator.operatorDetails.currentTotalShares

  if (currentTotalShares === BigInt(0)) {
    return PRECISION_18 // Default to 1.0 (scaled) if no shares, to avoid division by zero
  }

  // Share price = (total stake + taxed reward) / total shares, scaled by 10^18 for precision
  return ((currentTotalStake + taxedReward) * PRECISION_18) / currentTotalShares
}

/**
 * Calculates the nominator's staking position.
 * @param deposit The nominator's deposit data.
 * @param instantSharePrice The current instant share price (scaled by 10^18).
 * @param historicalSharePrice The share price from the epoch of the pending deposit, if available (scaled by 10^18).
 * @returns An object with the staked amount and raw storage fee deposits.
 */
export const calculateNominatorPosition = ({
  deposit,
  instantSharePrice,
  historicalSharePrice,
}: {
  deposit: Deposit
  instantSharePrice: bigint
  historicalSharePrice?: bigint | null
}) => {
  const knownShares = deposit.known.shares
  let postPendingShares = BigInt(0)

  // If a pending deposit exists and the historical share price for its epoch is known,
  // we can calculate its value in shares.
  if (deposit.pending && historicalSharePrice) {
    const pendingAmount = deposit.pending.amount
    postPendingShares = (pendingAmount * PRECISION_18) / historicalSharePrice
  }

  const totalShares = knownShares + postPendingShares
  const stakedAmount = (totalShares * instantSharePrice) / PRECISION_18

  // Per Phase 1, we return the raw storage fee values.
  const rawStorageFeeDepositKnown = deposit.known.storageFeeDeposit
  const rawStorageFeeDepositPending = deposit.pending
    ? deposit.pending.storageFeeDeposit
    : BigInt(0)

  return {
    stakedAmount,
    rawStorageFeeDepositKnown,
    rawStorageFeeDepositPending,
    totalShares,
  }
}

/**
 * Calculates the value of a nominator's withdrawals.
 * @param withdrawal The nominator's withdrawal data.
 * @param instantSharePrice The current instant share price (scaled by 10^18).
 * @param historicalSharePrice The share price from the epoch of the `withdrawalInShares`, if available (scaled by 10^18).
 * @returns An object detailing the total and component values of pending withdrawals.
 */
export const calculateNominatorWithdrawals = ({
  withdrawal,
  instantSharePrice,
  historicalSharePrice,
}: {
  withdrawal: Withdrawal
  instantSharePrice: bigint
  historicalSharePrice?: bigint | null
}) => {
  let valueOfWithdrawalInShares = BigInt(0)
  let storageFeeInShares = BigInt(0)

  // Use the historical price if the epoch has ended, otherwise use the instant price.
  const sharePriceForPending = historicalSharePrice || instantSharePrice

  if (withdrawal.withdrawalInShares) {
    const shares = withdrawal.withdrawalInShares.shares
    storageFeeInShares = withdrawal.withdrawalInShares.storageFeeRefund
    const valueInTokens = (shares * sharePriceForPending) / PRECISION_18
    valueOfWithdrawalInShares = valueInTokens + storageFeeInShares
  }

  const totalWithdrawalAmount = withdrawal.totalWithdrawalAmount

  // Calculate the total storage fee from all parts of the withdrawal
  const storageFeeFromUnlockable = (withdrawal.withdrawals || []).reduce(
    (total: bigint, w: WithdrawalUnlock) => total + w.storageFeeRefund,
    BigInt(0),
  )
  const totalStorageFeeWithdrawal = storageFeeFromUnlockable + storageFeeInShares

  // As per staking.md, the total value is the sum of confirmed withdrawals
  // plus the calculated value of the pending 'in-shares' withdrawal.
  // Formula: totalWithdrawalAmount + totalStorageFeeWithdrawal + value_of(withdrawalInShares.shares)
  // Since valueOfWithdrawalInShares = valueInTokens + storageFeeInShares, and
  // totalStorageFeeWithdrawal already includes storageFeeInShares, we need:
  const valueInTokensOnly = valueOfWithdrawalInShares - storageFeeInShares
  const totalPendingWithdrawals =
    totalWithdrawalAmount + totalStorageFeeWithdrawal + valueInTokensOnly

  return {
    totalPendingWithdrawals,
    unlockableWithdrawalsValue: totalWithdrawalAmount,
    storageFeeRefundValue: totalStorageFeeWithdrawal,
    pendingWithdrawalInSharesValue: valueOfWithdrawalInShares,
  }
}
