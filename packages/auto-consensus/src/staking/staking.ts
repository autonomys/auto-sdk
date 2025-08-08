// file: src/staking/staking.ts

import { Api, signingKey as signingKeyFn } from '@autonomys/auto-utils'
import type {
  NominateOperatorParams,
  RegisterOperatorParams,
  StakingParams,
  StringNumberOrBigInt,
  WithdrawStakeParams,
} from '../types/staking'
import {
  parseDeposit,
  parseOperator,
  parseOperatorDetails,
  parseString,
  parseWithdrawal,
} from '../utils/parse'

/**
 * Retrieves all registered operators on the network.
 */
export const operators = async (api: Api) => {
  try {
    const _operators = await api.query.domains.operators.entries()
    return _operators.map((o) => parseOperator(o))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error querying operators list.' + error)
  }
}

/**
 * Retrieves detailed information about a specific operator.
 */
export const operator = async (api: Api, operatorId: StringNumberOrBigInt) => {
  try {
    const _operator = await api.query.domains.operators(parseString(operatorId))
    return parseOperatorDetails(_operator)
  } catch (error) {
    console.error('error', error)
    throw new Error(`Error querying operatorId: ${operatorId} with error: ${error}`)
  }
}

/**
 * Retrieves deposit information for an operator.
 */
export const deposits = async (
  api: Api,
  operatorId: StringNumberOrBigInt,
  account: string | undefined = undefined,
) => {
  try {
    if (account) {
      const _deposits = await api.query.domains.deposits.entries(parseString(operatorId))
      return _deposits.map((o) => parseDeposit(o)).filter((deposit) => deposit.account === account)
    } else {
      const _deposits = await api.query.domains.deposits.entries(parseString(operatorId))
      return _deposits.map((o) => parseDeposit(o))
    }
  } catch (error) {
    console.error('error', error)
    throw new Error('Error querying deposits list.' + error)
  }
}

/**
 * Retrieves withdrawal information for an operator.
 */
export const withdrawals = async (
  api: Api,
  operatorId: StringNumberOrBigInt,
  account: string | undefined = undefined,
) => {
  try {
    if (account) {
      const _withdrawals = await api.query.domains.withdrawals.entries(parseString(operatorId))
      return _withdrawals
        .map((o) => parseWithdrawal(o))
        .filter((withdrawal) => withdrawal.account === account)
    } else {
      const _withdrawals = await api.query.domains.withdrawals.entries(parseString(operatorId))
      return _withdrawals.map((o) => parseWithdrawal(o))
    }
  } catch (error) {
    console.error('error', error)
    throw new Error('Error querying withdrawals list.' + error)
  }
}

/**
 * Creates a transaction to register a new operator.
 */
export const registerOperator = (params: RegisterOperatorParams) => {
  try {
    const { api, domainId, amountToStake, minimumNominatorStake, nominationTax, publicKey } = params
    let signingKey = params.signingKey

    if (!signingKey && !publicKey) throw new Error('Signing key or public key not provided')
    else if (!signingKey && publicKey) signingKey = signingKeyFn(publicKey)

    if (!signingKey) throw new Error('Signing key not provided')

    return api.tx.domains.registerOperator(parseString(domainId), parseString(amountToStake), {
      signingKey,
      minimumNominatorStake: parseString(minimumNominatorStake),
      nominationTax: parseString(nominationTax),
    })
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating register operator tx.' + error)
  }
}

/**
 * Creates a transaction to nominate (stake to) an existing operator.
 */
export const nominateOperator = (params: NominateOperatorParams) => {
  try {
    const { api, operatorId, amountToStake } = params

    return api.tx.domains.nominateOperator(parseString(operatorId), parseString(amountToStake))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating nominate operator tx.' + error)
  }
}

/**
 * Creates a transaction to withdraw stake from an operator (shares-only).
 */
export const withdrawStake = (params: WithdrawStakeParams) => {
  try {
    const { api, operatorId, shares } = params
    if (shares === undefined || shares === null)
      throw new Error('Provide shares(string/number/bigint) to withdraw stake')

    return api.tx.domains.withdrawStake(parseString(operatorId), parseString(shares))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating withdraw stake tx.' + error)
  }
}

/**
 * Creates a transaction to deregister an operator.
 */
export const deregisterOperator = (params: StakingParams) => {
  try {
    const { api, operatorId } = params

    return api.tx.domains.deregisterOperator(parseString(operatorId))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating de-register operator tx.' + error)
  }
}

/**
 * Creates a transaction to unlock funds from an operator.
 */
export const unlockFunds = (params: StakingParams) => {
  try {
    const { api, operatorId } = params

    return api.tx.domains.unlockFunds(parseString(operatorId))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating unlock funds tx.' + error)
  }
}

/**
 * Creates a transaction to unlock a nominator from an operator.
 */
export const unlockNominator = (params: StakingParams) => {
  try {
    const { api, operatorId } = params

    return api.tx.domains.unlockNominator(parseString(operatorId))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating unlock nominator tx.' + error)
  }
}