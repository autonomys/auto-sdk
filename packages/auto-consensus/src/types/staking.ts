import type { ApiPromise, KeyringPair } from '@autonomys/auto-utils'

export type RawOperatorId = string[]

export type RawDepositHeader = [string, string]

export type RawOperatorDetails = {
  signingKey: string
  currentDomainId: number
  nextDomainId: number
  minimumNominatorStake: string
  nominationTax: number
  currentTotalStake: number
  currentEpochRewards: number
  currentTotalShares: number
  status: object[]
  depositsInEpoch: string
  withdrawalsInEpoch: number
  totalStorageFeeDeposit: string
}

export type NominatorCount = {
  operatorId: number
  count: number
}

export type OperatorIdOwner = {
  operatorId: number
  owner: string
}

export type OperatorDetails = {
  signingKey: string
  currentDomainId: bigint
  nextDomainId: bigint
  minimumNominatorStake: bigint
  nominationTax: number
  currentTotalStake: bigint
  currentEpochRewards: bigint
  currentTotalShares: bigint
  status: object[]
  depositsInEpoch: bigint
  withdrawalsInEpoch: bigint
  totalStorageFeeDeposit: bigint
}

export type Operator = {
  operatorId: bigint
  operatorDetails: OperatorDetails
}

export type RawDeposit = {
  known: {
    shares: number
    storageFeeDeposit: number
  }
  pending: {
    effectiveDomainEpoch: number[]
    amount: string
    storageFeeDeposit: string
  }
}

export type Deposit = {
  operatorId: bigint
  account: string
  shares: bigint
  storageFeeDeposit: bigint
  pending: {
    amount: bigint
    storageFeeDeposit: bigint
  }
}

export type Withdrawal = {
  operatorId: number
  account: string
  totalWithdrawalAmount: number
  withdrawals: string[]
  withdrawalInShares: {
    domainEpoch: number[]
    unlockAtConfirmedDomainBlockNumber: number
    shares: string
    storageFeeRefund: string
  }
}

export type StringNumberOrBigInt = string | number | bigint

export type RegisterOperatorParams = {
  api: ApiPromise
  senderAddress: string
  Operator: KeyringPair
  domainId: StringNumberOrBigInt
  amountToStake: StringNumberOrBigInt
  minimumNominatorStake: StringNumberOrBigInt
  nominationTax: StringNumberOrBigInt
}

export type StakingParams = {
  api: ApiPromise
  operatorId: StringNumberOrBigInt
}

export interface WithdrawStakeParams extends StakingParams {
  shares: StringNumberOrBigInt
}

export interface NominateOperatorParams extends StakingParams {
  amountToStake: StringNumberOrBigInt
}
