// file: src/staking.ts

import {
  Api,
  Codec,
  createWithdrawStakeAll,
  createWithdrawStakeByPercent,
  createWithdrawStakeByShares,
  createWithdrawStakeByStake,
  signingKey as signingKeyFn,
} from '@autonomys/auto-utils'
import type {
  NominateOperatorParams,
  RegisterOperatorParams,
  StakingParams,
  StringNumberOrBigInt,
  WithdrawStakeParams,
} from './types/staking'
import {
  parseDeposit,
  parseOperator,
  parseOperatorDetails,
  parseString,
  parseWithdrawal,
} from './utils/parse'

/**
 * Retrieves all registered operators on the network.
 * 
 * This function queries the blockchain to get information about all operators
 * that have been registered across all domains. Operators are entities that
 * process transactions and maintain domain chains.
 * 
 * @param api - The connected API instance
 * @returns Promise that resolves to an array of Operator objects
 * @throws Error if the operators query fails
 * 
 * @example
 * ```typescript
 * import { operators } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * const allOperators = await operators(api)
 * 
 * allOperators.forEach(op => {
 *   console.log(`Operator ${op.operatorId}: Domain ${op.operatorDetails.currentDomainId}`)
 *   console.log(`Total Stake: ${op.operatorDetails.currentTotalStake}`)
 * })
 * ```
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
 * 
 * This function queries information about a single operator including their
 * signing key, domain assignment, stake amounts, and operational status.
 * 
 * @param api - The connected API instance
 * @param operatorId - The ID of the operator to query
 * @returns Promise that resolves to OperatorDetails object
 * @throws Error if the operator query fails or operator doesn't exist
 * 
 * @example
 * ```typescript
 * import { operator } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * const operatorInfo = await operator(api, '1')
 * 
 * console.log(`Domain: ${operatorInfo.currentDomainId}`)
 * console.log(`Total Stake: ${operatorInfo.currentTotalStake}`)
 * console.log(`Minimum Nominator Stake: ${operatorInfo.minimumNominatorStake}`)
 * console.log(`Nomination Tax: ${operatorInfo.nominationTax}%`)
 * ```
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
 * 
 * This function queries all deposits (stakes) made to a specific operator.
 * It can optionally filter deposits by a specific account address.
 * 
 * @param api - The connected API instance
 * @param operatorId - The ID of the operator to query deposits for
 * @param account - Optional account address to filter deposits by
 * @returns Promise that resolves to an array of Deposit objects
 * @throws Error if the deposits query fails
 * 
 * @example
 * ```typescript
 * import { deposits } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * 
 * // Get all deposits for operator
 * const allDeposits = await deposits(api, '1')
 * 
 * // Get deposits for specific account
 * const accountDeposits = await deposits(api, '1', 'account_address')
 * 
 * allDeposits.forEach(deposit => {
 *   console.log(`Account: ${deposit.account}, Shares: ${deposit.shares}`)
 * })
 * ```
 */
export const deposits = async (
  api: Api,
  operatorId: StringNumberOrBigInt,
  account: string | undefined = undefined,
) => {
  try {
    if (account) {
      // For specific account, query all deposits for operator and filter
      const _deposits = await api.query.domains.deposits.entries(parseString(operatorId))
      return _deposits.map((o) => parseDeposit(o)).filter((deposit) => deposit.account === account)
    } else {
      // Query all deposits for operator
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
 * 
 * This function queries all pending withdrawals for a specific operator.
 * Withdrawals are stakes that have been requested to be unstaked but are
 * still in the withdrawal period. Can optionally filter by account.
 * 
 * @param api - The connected API instance
 * @param operatorId - The ID of the operator to query withdrawals for
 * @param account - Optional account address to filter withdrawals by
 * @returns Promise that resolves to an array of Withdrawal objects
 * @throws Error if the withdrawals query fails
 * 
 * @example
 * ```typescript
 * import { withdrawals } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * 
 * // Get all withdrawals for operator
 * const allWithdrawals = await withdrawals(api, '1')
 * 
 * // Get withdrawals for specific account
 * const accountWithdrawals = await withdrawals(api, '1', 'account_address')
 * 
 * allWithdrawals.forEach(withdrawal => {
 *   console.log(`Account: ${withdrawal.account}`)
 *   console.log(`Total Withdrawal: ${withdrawal.totalWithdrawalAmount}`)
 * })
 * ```
 */
export const withdrawals = async (
  api: Api,
  operatorId: StringNumberOrBigInt,
  account: string | undefined = undefined,
) => {
  try {
    if (account) {
      // For specific account, query all withdrawals for operator and filter
      const _withdrawals = await api.query.domains.withdrawals.entries(parseString(operatorId))
      return _withdrawals
        .map((o) => parseWithdrawal(o))
        .filter((withdrawal) => withdrawal.account === account)
    } else {
      // Query all withdrawals for operator
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
 * 
 * This function creates a transaction to register a new operator on a specific domain.
 * The operator will be able to process transactions and earn rewards. Requires
 * initial stake, minimum nominator stake, and nomination tax settings.
 * 
 * @param params - RegisterOperatorParams containing all registration parameters
 * @param params.api - The connected API promise instance
 * @param params.domainId - The domain ID where the operator will be registered
 * @param params.amountToStake - Initial amount to stake (in smallest token units)
 * @param params.minimumNominatorStake - Minimum stake required from nominators
 * @param params.nominationTax - Percentage fee charged to nominators
 * @param params.signingKey - Optional signing key (derived from publicKey if not provided)
 * @param params.publicKey - Optional public key (used to derive signingKey if needed)
 * @returns A submittable operator registration transaction
 * @throws Error if signing key/public key not provided or transaction creation fails
 * 
 * @example
 * ```typescript
 * import { registerOperator } from '@autonomys/auto-consensus'
 * import { activate, activateWallet, signAndSendTx } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * const { accounts } = await activateWallet({ networkId: 'gemini-3h', mnemonic })
 * 
 * const registerTx = registerOperator({
 *   api,
 *   domainId: '0',
 *   amountToStake: '100000000000000000000', // 100 ATC
 *   minimumNominatorStake: '1000000000000000000', // 1 ATC
 *   nominationTax: '10', // 10%
 *   publicKey: accounts[0].publicKey
 * })
 * 
 * await signAndSendTx(accounts[0], registerTx)
 * ```
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
 * 
 * This function creates a transaction to stake tokens to an existing operator.
 * Nominators earn rewards proportional to their stake, minus the operator's
 * nomination tax. The stake helps secure the network and the specific domain.
 * 
 * @param params - NominateOperatorParams containing nomination parameters
 * @param params.api - The connected API promise instance
 * @param params.operatorId - The ID of the operator to nominate
 * @param params.amountToStake - Amount to stake (in smallest token units)
 * @returns A submittable operator nomination transaction
 * @throws Error if transaction creation fails
 * 
 * @example
 * ```typescript
 * import { nominateOperator } from '@autonomys/auto-consensus'
 * import { activate, signAndSendTx } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * 
 * const nominateTx = nominateOperator({
 *   api,
 *   operatorId: '1',
 *   amountToStake: '50000000000000000000' // 50 ATC
 * })
 * 
 * await signAndSendTx(nominator, nominateTx)
 * ```
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
 * Creates a transaction to withdraw stake from an operator.
 * 
 * This function creates a transaction to withdraw staked tokens from an operator.
 * Supports different withdrawal modes: all stake, by percentage, by specific amount,
 * or by number of shares. Withdrawn stake enters a withdrawal period before being available.
 * 
 * @param params - WithdrawStakeParams containing withdrawal parameters
 * @param params.api - The connected API promise instance
 * @param params.operatorId - The ID of the operator to withdraw stake from
 * @param params.all - Optional: withdraw all stake (boolean)
 * @param params.percent - Optional: withdraw by percentage (string/number)
 * @param params.stake - Optional: withdraw specific stake amount
 * @param params.shares - Optional: withdraw specific number of shares
 * @returns A submittable stake withdrawal transaction
 * @throws Error if no withdrawal method specified or transaction creation fails
 * 
 * @example
 * ```typescript
 * import { withdrawStake } from '@autonomys/auto-consensus'
 * import { activate, signAndSendTx } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * 
 * // Withdraw all stake
 * const withdrawAllTx = withdrawStake({ api, operatorId: '1', all: true })
 * 
 * // Withdraw 50% of stake
 * const withdrawPercentTx = withdrawStake({ api, operatorId: '1', percent: '50' })
 * 
 * // Withdraw specific amount
 * const withdrawAmountTx = withdrawStake({ 
 *   api, 
 *   operatorId: '1', 
 *   stake: '25000000000000000000' 
 * })
 * 
 * await signAndSendTx(staker, withdrawAllTx)
 * ```
 */
export const withdrawStake = (params: WithdrawStakeParams) => {
  try {
    const { api, operatorId } = params
    let param2: Codec | null = null
    if (params.all) param2 = createWithdrawStakeAll(api)
    else if (params.percent) param2 = createWithdrawStakeByPercent(api, parseString(params.percent))
    else if (params.stake) param2 = createWithdrawStakeByStake(api, parseString(params.stake))
    else if (params.shares) param2 = createWithdrawStakeByShares(api, parseString(params.shares))

    if (param2 === null)
      throw new Error(
        'Provide all(boolean), percent(string/number/bigint), stake(string/number/bigint) or shared(string/number/bigint) to withdraw stake',
      )

    return api.tx.domains.withdrawStake(parseString(operatorId), param2)
  } catch (error) {
    console.error('error', error)
    throw new Error('Error creating withdraw stake tx.' + error)
  }
}

/**
 * Creates a transaction to deregister an operator.
 * 
 * This function creates a transaction to deregister an operator, removing them
 * from active service. The operator will no longer process transactions or earn
 * rewards. All stakes will enter the withdrawal period.
 * 
 * @param params - StakingParams containing the operator information
 * @param params.api - The connected API promise instance  
 * @param params.operatorId - The ID of the operator to deregister
 * @returns A submittable operator deregistration transaction
 * @throws Error if transaction creation fails
 * 
 * @example
 * ```typescript
 * import { deregisterOperator } from '@autonomys/auto-consensus'
 * import { activate, signAndSendTx } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * 
 * const deregisterTx = deregisterOperator({
 *   api,
 *   operatorId: '1'
 * })
 * 
 * await signAndSendTx(operatorOwner, deregisterTx)
 * ```
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
 * 
 * This function creates a transaction to unlock funds that have completed
 * their withdrawal period. These are funds that were previously withdrawn
 * and have now passed the required waiting period.
 * 
 * @param params - StakingParams containing the operator information
 * @param params.api - The connected API promise instance
 * @param params.operatorId - The ID of the operator to unlock funds from
 * @returns A submittable unlock funds transaction
 * @throws Error if transaction creation fails
 * 
 * @example
 * ```typescript
 * import { unlockFunds } from '@autonomys/auto-consensus'
 * import { activate, signAndSendTx } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * 
 * const unlockTx = unlockFunds({
 *   api,
 *   operatorId: '1'
 * })
 * 
 * await signAndSendTx(account, unlockTx)
 * ```
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
 * 
 * This function creates a transaction to unlock a nominator's position,
 * allowing them to withdraw their stake after the withdrawal period.
 * This is typically used when a nominator wants to completely exit their
 * position with an operator.
 * 
 * @param params - StakingParams containing the operator information
 * @param params.api - The connected API promise instance
 * @param params.operatorId - The ID of the operator to unlock nominator from
 * @returns A submittable unlock nominator transaction
 * @throws Error if transaction creation fails
 * 
 * @example
 * ```typescript
 * import { unlockNominator } from '@autonomys/auto-consensus'
 * import { activate, signAndSendTx } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * 
 * const unlockNominatorTx = unlockNominator({
 *   api,
 *   operatorId: '1'
 * })
 * 
 * await signAndSendTx(nominator, unlockNominatorTx)
 * ```
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
