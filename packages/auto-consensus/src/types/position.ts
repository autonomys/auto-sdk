export type NominatorPosition = {
  currentStakedValue: bigint
  totalShares: bigint
  storageFeeDeposit: {
    totalDeposited: bigint
    currentValue: bigint
  }
  pendingDeposit: {
    amount: bigint
    effectiveEpoch: number
  } | null
  pendingWithdrawals: {
    stakeWithdrawalAmount: bigint
    storageFeeRefund: bigint
    unlockAtBlock: number
  }[]
}
