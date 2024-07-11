// file: src/staking.ts

import type { ApiPromise, KeyringPair } from '@autonomys/auto-utils'
import { createAccountIdType, signingKey } from '@autonomys/auto-utils'
import type { StorageKey } from '@polkadot/types'
import type { AnyTuple, Codec } from '@polkadot/types-codec/types'

type RawOperatorId = string[]
type RawOperatorDetails = {
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

type StringNumberOrBigInt = string | number | bigint

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

const parseOperatorDetails = (operatorDetails: Codec): OperatorDetails => {
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

const parseOperator = (operator: [StorageKey<AnyTuple>, Codec]): Operator => {
  return {
    operatorId: BigInt((operator[0].toHuman() as RawOperatorId)[0]),
    operatorDetails: parseOperatorDetails(operator[1]),
  }
}

const parseString = (operatorId: StringNumberOrBigInt): string =>
  typeof operatorId === 'string' ? operatorId : operatorId.toString()

export const operators = async (api: ApiPromise) => {
  try {
    const _operators = await api.query.domains.operators.entries()
    return _operators.map((o) => parseOperator(o))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error querying operators list.' + error)
  }
}

export const operator = async (api: ApiPromise, operatorId: StringNumberOrBigInt) => {
  try {
    const _operator = await api.query.domains.operators(parseString(operatorId))
    return parseOperatorDetails(_operator)
  } catch (error) {
    console.error('error', error)
    throw new Error(`Error querying operatorId: ${operatorId} with error: ${error}`)
  }
}

export const registerOperator = async (params: RegisterOperatorParams) => {
  try {
    const {
      api,
      senderAddress,
      Operator,
      domainId,
      amountToStake,
      minimumNominatorStake,
      nominationTax,
    } = params

    const message = createAccountIdType(api, senderAddress)
    const signature = Operator.sign(message)

    return await api.tx.domains.registerOperator(
      parseString(domainId),
      parseString(amountToStake),
      {
        signingKey: signingKey(Operator.publicKey),
        minimumNominatorStake: parseString(minimumNominatorStake),
        nominationTax: parseString(nominationTax),
      },
      signature,
    )
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating register operator tx.' + error)
  }
}

export const nominateOperator = async (params: NominateOperatorParams) => {
  try {
    const { api, operatorId, amountToStake } = params

    return await api.tx.domains.nominateOperator(
      parseString(operatorId),
      parseString(amountToStake),
    )
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating nominate operator tx.' + error)
  }
}

export const withdrawStake = async (params: WithdrawStakeParams) => {
  try {
    const { api, operatorId, shares } = params

    return await api.tx.domains.withdrawStake(parseString(operatorId), parseString(shares))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating withdraw stake tx.' + error)
  }
}

export const deregisterOperator = async (params: StakingParams) => {
  try {
    const { api, operatorId } = params

    return await api.tx.domains.deregisterOperator(parseString(operatorId))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating de-register operator tx.' + error)
  }
}

export const unlockFunds = async (params: StakingParams) => {
  try {
    const { api, operatorId } = params

    return await api.tx.domains.unlockFunds(parseString(operatorId))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating unlock funds tx.' + error)
  }
}

export const unlockNominator = async (params: StakingParams) => {
  try {
    const { api, operatorId } = params

    return await api.tx.domains.unlockNominator(parseString(operatorId))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating unlock nominator tx.' + error)
  }
}
