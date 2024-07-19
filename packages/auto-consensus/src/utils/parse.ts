import type { StorageKey } from '@polkadot/types'
import { AnyTuple, Codec } from '@polkadot/types-codec/types'
import { DomainRegistry } from '../types'
import {
  Deposit,
  Operator,
  OperatorDetails,
  RawDeposit,
  RawDepositHeader,
  RawOperatorDetails,
  RawOperatorId,
  StringNumberOrBigInt,
  Withdrawal,
} from '../types/staking'

export const parseDomain = (domain: [StorageKey<AnyTuple>, Codec]): DomainRegistry => {
  const header = domain[0].toHuman() as [string]
  return {
    domainId: header[0],
    ...(domain[1].toJSON() as Omit<DomainRegistry, 'domainId'>),
  } as DomainRegistry
}

export const parseOperatorDetails = (operatorDetails: Codec): OperatorDetails => {
  const rawOD = operatorDetails.toJSON() as RawOperatorDetails
  return {
    signingKey: rawOD.signingKey,
    currentDomainId: BigInt(rawOD.currentDomainId),
    nextDomainId: BigInt(rawOD.nextDomainId),
    minimumNominatorStake: BigInt(rawOD.minimumNominatorStake),
    nominationTax: rawOD.nominationTax,
    currentTotalStake: BigInt(rawOD.currentTotalStake),
    currentEpochRewards: BigInt(rawOD.currentEpochRewards),
    currentTotalShares: BigInt(rawOD.currentTotalShares),
    status: rawOD.status,
    depositsInEpoch: BigInt(rawOD.depositsInEpoch),
    withdrawalsInEpoch: BigInt(rawOD.withdrawalsInEpoch),
    totalStorageFeeDeposit: BigInt(rawOD.totalStorageFeeDeposit),
  }
}

export const parseOperator = (operator: [StorageKey<AnyTuple>, Codec]): Operator => {
  return {
    operatorId: BigInt((operator[0].toHuman() as RawOperatorId)[0]),
    operatorDetails: parseOperatorDetails(operator[1]),
  }
}

export const parseDeposit = (deposit: [StorageKey<AnyTuple>, Codec]): Deposit => {
  const header = deposit[0].toHuman() as RawDepositHeader
  const parsedDeposit = deposit[1].toJSON() as RawDeposit
  return {
    operatorId: BigInt(header[0]),
    account: header[1],
    shares: BigInt(parsedDeposit.known.shares.toString()),
    storageFeeDeposit: BigInt(parsedDeposit.known.storageFeeDeposit.toString()),
    pending: {
      amount: BigInt(parsedDeposit.pending.amount),
      storageFeeDeposit: BigInt(parsedDeposit.pending.storageFeeDeposit),
    },
  }
}

export const parseWithdrawal = (withdrawal: [StorageKey<AnyTuple>, Codec]): Withdrawal => {
  const header = withdrawal[0].toHuman() as RawDepositHeader
  const parsedWithdrawal = withdrawal[1].toJSON() as Omit<Withdrawal, 'operatorId'>
  return {
    operatorId: parseInt(header[0]),
    account: header[1],
    totalWithdrawalAmount: parsedWithdrawal.totalWithdrawalAmount,
    withdrawals: parsedWithdrawal.withdrawals,
    withdrawalInShares: {
      domainEpoch: parsedWithdrawal.withdrawalInShares.domainEpoch,
      unlockAtConfirmedDomainBlockNumber:
        parsedWithdrawal.withdrawalInShares.unlockAtConfirmedDomainBlockNumber,
      shares: BigInt(parsedWithdrawal.withdrawalInShares.shares).toString(10),
      storageFeeRefund: BigInt(parsedWithdrawal.withdrawalInShares.storageFeeRefund).toString(10),
    },
  }
}

export const parseString = (operatorId: StringNumberOrBigInt): string =>
  typeof operatorId === 'string' ? operatorId : operatorId.toString()
