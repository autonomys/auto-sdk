export type NominatorPosition = {
  knownValue: bigint
  pendingDeposits: {
    amount: bigint
    effectiveEpoch: number
  }[]
  pendingWithdrawals: {
    amount: bigint
    unlockAtDomainBlock: number
  }[]
  storageFeeDeposit: bigint
}
