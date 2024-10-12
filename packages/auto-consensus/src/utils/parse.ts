import type { AnyTuple, BN, Codec, StorageKey } from '@autonomys/auto-utils'
import type { BalanceData, RawBalanceData } from '../types/balance'
import { DomainRegistry } from '../types/domain'
import {
  Deposit,
  Operator,
  OperatorDetails,
  RawDeposit,
  RawDepositHeader,
  RawOperatorDetails,
  RawOperatorId,
  RawWithdrawal,
  RawWithdrawalHeader,
  StringNumberOrBigInt,
  Withdrawal,
} from '../types/staking'

export const parseBN = (value: BN): bigint => BigInt(value.toString())

export const parseBalance = (data: RawBalanceData): BalanceData => {
  try {
    return {
      free: parseBN(data.free),
      reserved: parseBN(data.reserved),
      frozen: parseBN(data.frozen),
      flags: parseBN(data.flags),
    }
  } catch (error) {
    console.error('Error parsing balance:', error)
    throw new Error('Failed to parse balance')
  }
}

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
  const pending =
    parsedDeposit.pending !== null
      ? {
          effectiveDomainId: parsedDeposit.pending.effectiveDomainEpoch[0],
          effectiveDomainEpoch: parsedDeposit.pending.effectiveDomainEpoch[1],
          amount: BigInt(parsedDeposit.pending.amount),
          storageFeeDeposit: BigInt(parsedDeposit.pending.storageFeeDeposit),
        }
      : null
  return {
    operatorId: parseInt(header[0]),
    account: header[1],
    shares: BigInt(parsedDeposit.known.shares.toString()),
    storageFeeDeposit: BigInt(parsedDeposit.known.storageFeeDeposit.toString()),
    known: {
      shares: BigInt(parsedDeposit.known.shares.toString()),
      storageFeeDeposit: BigInt(parsedDeposit.known.storageFeeDeposit.toString()),
    },
    pending,
  } as Deposit
}

export const parseWithdrawal = (withdrawal: [StorageKey<AnyTuple>, Codec]): Withdrawal => {
  const header = withdrawal[0].toHuman() as RawWithdrawalHeader
  const parsedWithdrawal = withdrawal[1].toJSON() as RawWithdrawal
  return {
    operatorId: parseInt(header[0]),
    account: header[1],
    totalWithdrawalAmount: BigInt(parsedWithdrawal.totalWithdrawalAmount),
    withdrawalInShares: {
      domainEpoch: parsedWithdrawal.withdrawalInShares.domainEpoch,
      unlockAtConfirmedDomainBlockNumber:
        parsedWithdrawal.withdrawalInShares.unlockAtConfirmedDomainBlockNumber,
      shares: BigInt(parsedWithdrawal.withdrawalInShares.shares),
      storageFeeRefund: BigInt(parsedWithdrawal.withdrawalInShares.storageFeeRefund),
    },
    withdrawals:
      parsedWithdrawal.withdrawals &&
      parsedWithdrawal.withdrawals.length > 0 &&
      parsedWithdrawal.withdrawals.map((w) => ({
        domainId: w.domainId,
        unlockAtConfirmedDomainBlockNumber: w.unlockAtConfirmedDomainBlockNumber,
        amountToUnlock: BigInt(w.amountToUnlock),
        storageFeeRefund: BigInt(w.storageFeeRefund),
      })),
  } as Withdrawal
}

export const parseString = (operatorId: StringNumberOrBigInt): string =>
  typeof operatorId === 'string' ? operatorId : operatorId.toString()
