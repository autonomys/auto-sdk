import { u8aToHex } from '@polkadot/util'
import { operator, operators, RegisterOperatorInput } from '../../src/staking'

export const verifyOperatorRegistration = async (input: RegisterOperatorInput) => {
  const { api, Operator, domainId, minimumNominatorStake, nominationTax } = input

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
}
