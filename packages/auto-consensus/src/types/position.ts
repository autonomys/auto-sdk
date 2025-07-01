export type NominatorPosition = {
  knownValue: bigint
  pendingDeposits: {
    amount: bigint
    effectiveEpoch: number
  }[]
  pendingWithdrawals: {
    stakeWithdrawalAmount: bigint
    unlockAtDomainBlock: number
    storageFeeRefund: bigint
  }[]
  storageFeeDeposit: bigint
}
