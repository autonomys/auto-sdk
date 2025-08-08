import { u8aToHex } from '@polkadot/util'
import { operator, operators } from '../../src/staking/staking'
import type { RegisterOperatorParams } from '../../src/types/staking'

const STORAGE_FEE_DEPOSIT_PERCENTAGE = 20 // 20%

export const parseBigInt = (operatorId: string | number | bigint): bigint =>
  typeof operatorId === 'bigint' ? operatorId : BigInt(operatorId)

export const calculateStake = (params: RegisterOperatorParams) => {
  const { amountToStake, nominationTax } = params

  return (parseBigInt(amountToStake) * BigInt(100 - STORAGE_FEE_DEPOSIT_PERCENTAGE)) / BigInt(100)
  // To-Do: Add the nomination tax
}

export const calculateStorageFee = (params: RegisterOperatorParams) => {
  const { amountToStake } = params

  return (parseBigInt(amountToStake) * BigInt(STORAGE_FEE_DEPOSIT_PERCENTAGE)) / BigInt(100)
}

export const verifyOperatorRegistration = async (params: RegisterOperatorParams) => {
  const { api, Operator, domainId, minimumNominatorStake, nominationTax } = params

  const operatorsList = await operators(api)
  const findOperator = operatorsList.find(
    (o) => o.operatorDetails.signingKey === u8aToHex(Operator.publicKey),
  )
  expect(findOperator).toBeDefined()
  if (findOperator) {
    expect(findOperator.operatorDetails.currentDomainId).toEqual(BigInt(domainId))
    expect(findOperator.operatorDetails.currentTotalStake).toEqual(BigInt(0))
    expect(findOperator.operatorDetails.minimumNominatorStake).toEqual(
      BigInt(minimumNominatorStake),
    )
    expect(findOperator.operatorDetails.nominationTax).toEqual(Number(nominationTax))
    expect(findOperator.operatorDetails.status).toEqual({ registered: null })
    const thisOperator = await operator(api, findOperator.operatorId)
    expect(thisOperator.currentDomainId).toEqual(BigInt(domainId))
    expect(thisOperator.currentTotalStake).toEqual(BigInt(0))
    expect(thisOperator.minimumNominatorStake).toEqual(BigInt(minimumNominatorStake))
    expect(thisOperator.nominationTax).toEqual(Number(nominationTax))
    expect(thisOperator.status).toEqual({ registered: null })
  }

  return findOperator
}

export const verifyOperatorRegistrationFinal = async (params: RegisterOperatorParams) => {
  const { api, Operator, domainId, amountToStake, minimumNominatorStake, nominationTax } = params

  const operatorsList = await operators(api)
  const findOperator = operatorsList.find(
    (o) => o.operatorDetails.signingKey === u8aToHex(Operator.publicKey),
  )
  expect(findOperator).toBeDefined()
  if (findOperator) {
    expect(findOperator.operatorDetails.currentDomainId).toEqual(BigInt(domainId))
    expect(findOperator.operatorDetails.currentTotalStake).toEqual(
      (BigInt(amountToStake) / BigInt(100)) * BigInt(80),
    )
    expect(findOperator.operatorDetails.minimumNominatorStake).toEqual(
      BigInt(minimumNominatorStake),
    )
    expect(findOperator.operatorDetails.nominationTax).toEqual(Number(nominationTax))
    expect(findOperator.operatorDetails.totalStorageFeeDeposit).toEqual(
      (BigInt(amountToStake) / BigInt(100)) * BigInt(20),
    )
    const thisOperator = await operator(api, findOperator.operatorId)
    expect(thisOperator.currentDomainId).toEqual(BigInt(domainId))
    expect(thisOperator.currentTotalStake).toEqual(calculateStake(params))
    expect(thisOperator.minimumNominatorStake).toEqual(BigInt(minimumNominatorStake))
    expect(thisOperator.nominationTax).toEqual(Number(nominationTax))
    expect(thisOperator.totalStorageFeeDeposit).toEqual(calculateStorageFee(params))
  }

  return findOperator
}
