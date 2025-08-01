import type { ApiPromise } from '@autonomys/auto-utils'

export type RawOperatorId = string[]

export type RawOperatorDetails = {
  signingKey: string
  currentDomainId: number
  nextDomainId: number
  minimumNominatorStake: string
  nominationTax: number
  currentTotalStake: number
  currentTotalShares: number
  partialStatus: object
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
  currentTotalShares: bigint
  partialStatus: object
  depositsInEpoch: bigint
  withdrawalsInEpoch: bigint
  totalStorageFeeDeposit: bigint
}

export type Operator = {
  operatorId: bigint
  operatorDetails: OperatorDetails
}

export type RawDepositHeader = [string, string]

export type RawDeposit = {
  known: {
    shares: number
    storageFeeDeposit: number
  }
  pending: {
    effectiveDomainEpoch: [number, number]
    amount: string
    storageFeeDeposit: string
  } | null
}

export type Deposit = {
  operatorId: number
  account: string
  shares: bigint
  storageFeeDeposit: bigint
  known: {
    shares: bigint
    storageFeeDeposit: bigint
  }
  pending: {
    effectiveDomainId: number
    effectiveDomainEpoch: number
    amount: bigint
    storageFeeDeposit: bigint
  } | null
}

export type RawWithdrawalHeader = [string, string]

export type RawWithdrawal = {
  totalWithdrawalAmount: string
  withdrawals:
    | {
        domainId: number
        unlockAtConfirmedDomainBlockNumber: number
        amountToUnlock: string
        storageFeeRefund: string
      }[]
    | null
  withdrawalInShares: {
    domainEpoch: number[]
    unlockAtConfirmedDomainBlockNumber: number
    shares: string
    storageFeeRefund: string
  } | null
}

export type WithdrawalUnlock = {
  domainId: number
  unlockAtConfirmedDomainBlockNumber: number
  amountToUnlock: bigint
  storageFeeRefund: bigint
}

export type WithdrawalInShares = {
  domainEpoch: number[]
  unlockAtConfirmedDomainBlockNumber: number
  shares: bigint
  storageFeeRefund: bigint
}

export type Withdrawal = {
  operatorId: number
  account: string
  totalWithdrawalAmount: bigint
  withdrawals: WithdrawalUnlock[]
  withdrawalInShares: WithdrawalInShares | null
}

export type StringNumberOrBigInt = string | number | bigint

export type RegisterOperatorParams = {
  api: ApiPromise
  domainId: StringNumberOrBigInt
  amountToStake: StringNumberOrBigInt
  minimumNominatorStake: StringNumberOrBigInt
  nominationTax: StringNumberOrBigInt
  signingKey?: string
  publicKey?: Uint8Array
}

export type StakingParams = {
  api: ApiPromise
  operatorId: StringNumberOrBigInt
}

export interface WithdrawStakeParams extends StakingParams {
  all?: boolean
  percent?: string | number
  stake?: StringNumberOrBigInt
  shares?: StringNumberOrBigInt
}

export interface NominateOperatorParams extends StakingParams {
  amountToStake: StringNumberOrBigInt
}
