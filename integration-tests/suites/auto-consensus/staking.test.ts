import {
  balance,
  deposits,
  deregisterOperator,
  events,
  nominateOperator,
  nominatorPosition,
  operator,
  operators,
  registerOperator,
  sudo,
  unlockFunds,
  unlockNominator,
  withdrawStake,
  type DeregisteredStatus,
  type OperatorPartialStatus,
} from '@autonomys/auto-consensus'
import { generateWallet, signAndSendTx } from '@autonomys/auto-utils'
import { u8aToHex } from '@polkadot/util'
import { cleanupChains, setupChains, setupWallets, waitForBlocks, waitUntil } from '../../helpers'

const UNIT = 1_000_000_000_000_000_000n
const INITIAL_STAKE = 100n * UNIT
const MINIMUM_NOMINATOR_STAKE = 10n * UNIT
const ADDITIONAL_STAKE = 50n * UNIT
const DOMAIN_ID = '0'
const NOMINATION_TAX = '5'
const STAKE_AFTER_REGISTRATION = (INITIAL_STAKE * 80n) / 100n

const logStep = (message: string) => {
  console.log(`[Auto-Consensus][Staking] ${message}`)
}

const getDeregisteredStatus = (partialStatus: OperatorPartialStatus): DeregisteredStatus | null => {
  if (partialStatus.Deregistered) {
    return partialStatus.Deregistered
  }
  // Handle lowercase variant from runtime serialization
  const lowerCase = partialStatus.deregistered as DeregisteredStatus | undefined
  return lowerCase ?? null
}

describe('Auto Consensus Staking Lifecycle', () => {
  let apis: Awaited<ReturnType<typeof setupChains>>
  let wallets: Awaited<ReturnType<typeof setupWallets>>

  beforeAll(async () => {
    apis = await setupChains()
    wallets = await setupWallets(apis.consensus)
  }, 300000)

  afterAll(async () => {
    await cleanupChains(apis)
  })

  const waitForOperatorBySigningKey = async (signingKeyHex: string) => {
    let foundOperator: Awaited<ReturnType<typeof operators>>[number] | undefined

    await waitUntil(async () => {
      const allOperators = await operators(apis.consensus)
      foundOperator = allOperators.find(
        (entry) => entry.operatorDetails.signingKey === signingKeyHex,
      )
      return Boolean(foundOperator)
    })

    return foundOperator!
  }

  const forceEpochTransition = async () => {
    const aliceAccount = wallets[0].accounts[0]
    logStep('Forcing staking epoch transition')
    await sudo(
      apis.consensus,
      aliceAccount,
      apis.consensus.tx.domains.forceStakingEpochTransition(DOMAIN_ID),
      {},
      events.forceDomainEpochTransition,
      false,
    )
  }

  test('retrieves operators list and detailed info', async () => {
    const allOperators = await operators(apis.consensus)

    expect(Array.isArray(allOperators)).toBe(true)
    expect(allOperators.length).toBeGreaterThan(0)

    const [firstOperator] = allOperators
    const operatorDetails = await operator(apis.consensus, firstOperator.operatorId)

    expect(operatorDetails.signingKey).toEqual(firstOperator.operatorDetails.signingKey)
    expect(operatorDetails.currentTotalStake).toBeGreaterThanOrEqual(0n)
  })

  test('registers, nominates, withdraws, and deregisters an operator', async () => {
    const aliceAccount = wallets[0].accounts[0]
    const bobAccount = wallets[1].accounts[0]
    const signingKeyWallet = generateWallet()
    if (!signingKeyWallet.keyringPair) throw new Error('Generated wallet missing signing key pair')
    const signingKeyHex = u8aToHex(signingKeyWallet.keyringPair.publicKey)

    const registerParams = {
      api: apis.consensus,
      domainId: DOMAIN_ID,
      amountToStake: INITIAL_STAKE.toString(),
      minimumNominatorStake: MINIMUM_NOMINATOR_STAKE.toString(),
      nominationTax: NOMINATION_TAX,
      publicKey: signingKeyWallet.keyringPair.publicKey,
    }

    logStep('Registering new operator')
    await signAndSendTx(
      aliceAccount,
      registerOperator(registerParams),
      {},
      events.operatorRegistered,
    )

    logStep('Waiting for operator registration to finalize')
    const newlyRegistered = await waitForOperatorBySigningKey(signingKeyHex)
    expect(newlyRegistered.operatorDetails.currentTotalStake).toEqual(STAKE_AFTER_REGISTRATION)

    const operatorId = newlyRegistered.operatorId.toString()

    await forceEpochTransition()

    logStep('Waiting for operator stake to become active')
    await waitUntil(async () => {
      const details = await operator(apis.consensus, operatorId)
      return details.currentTotalStake >= STAKE_AFTER_REGISTRATION
    })

    const beforeNomination = await operator(apis.consensus, operatorId)

    logStep('Bob nominating additional stake')
    await signAndSendTx(
      bobAccount,
      nominateOperator({
        api: apis.consensus,
        operatorId,
        amountToStake: ADDITIONAL_STAKE.toString(),
      }),
      {},
      events.operatorNominated,
    )

    await forceEpochTransition()

    logStep('Waiting for nomination to increase total stake')
    await waitUntil(async () => {
      const details = await operator(apis.consensus, operatorId)
      return details.currentTotalStake > beforeNomination.currentTotalStake
    })

    logStep('Waiting for nominator shares to be issued')
    await waitUntil(async () => {
      const position = await nominatorPosition(apis.consensus, operatorId, bobAccount.address)
      return position.totalShares > 0n
    })

    logStep(`Waiting for operator ${operatorId} deposits to appear`)
    await waitUntil(async () => {
      const operatorDeposits = await deposits(apis.consensus, operatorId)
      return operatorDeposits.length > 0
    })

    const bobPosition = await nominatorPosition(apis.consensus, operatorId, bobAccount.address)
    expect(bobPosition.totalShares).toBeGreaterThan(0n)
    expect(bobPosition.currentStakedValue).toBeGreaterThan(0n)

    const afterNomination = await operator(apis.consensus, operatorId)
    const shareQuotient = afterNomination.currentTotalShares / 10n
    const sharesToWithdraw = shareQuotient > 0n ? shareQuotient : afterNomination.currentTotalShares

    if (sharesToWithdraw <= 0n) {
      throw new Error('Unable to withdraw stake because no shares are available')
    }

    logStep('Bob withdrawing a portion of stake via shares')
    await signAndSendTx(
      bobAccount,
      withdrawStake({
        api: apis.consensus,
        operatorId,
        shares: sharesToWithdraw.toString(),
      }),
      {},
      events.withdrawStake,
    )

    logStep('Waiting for pending withdrawals to appear (manual withdrawal)')
    let manualUnlockBlock: number | null = null
    await waitUntil(async () => {
      const position = await nominatorPosition(apis.consensus, operatorId, bobAccount.address)
      if (position.pendingWithdrawals.length > 0) {
        manualUnlockBlock = position.pendingWithdrawals[0].unlockAtBlock
        return true
      }
      return false
    })

    logStep(`Waiting until domain block ${manualUnlockBlock!} to call unlockFunds`)
    await waitUntil(async () => {
      const header = await apis.domain.rpc.chain.getHeader()
      return header.number.toNumber() >= manualUnlockBlock!
    })

    logStep('Bob unlocking withdrawn stake via unlockFunds')
    await signAndSendTx(
      bobAccount,
      unlockFunds({
        api: apis.consensus,
        operatorId,
      }),
    )

    logStep('Waiting for manual withdrawal to clear')
    await waitUntil(async () => {
      const position = await nominatorPosition(apis.consensus, operatorId, bobAccount.address)
      return position.pendingWithdrawals.length === 0
    })

    await forceEpochTransition()

    logStep('Deregistering operator')
    await signAndSendTx(
      aliceAccount,
      deregisterOperator({
        api: apis.consensus,
        operatorId,
      }),
      {},
      events.operatorDeregistered,
    )

    await forceEpochTransition()

    logStep('Waiting for pending withdrawals after deregistration')
    let unlockBlock: number | null = null
    await waitUntil(async () => {
      const details = await operator(apis.consensus, operatorId)
      const deregisteredStatus = getDeregisteredStatus(details.partialStatus)
      if (deregisteredStatus && deregisteredStatus.unlockAtConfirmedDomainBlockNumber > 0) {
        unlockBlock = deregisteredStatus.unlockAtConfirmedDomainBlockNumber
        return true
      }
      return false
    })

    await waitUntil(async () => {
      const header = await apis.domain.rpc.chain.getHeader()
      return header.number.toNumber() >= unlockBlock!
    })

    logStep('Bob unlocking remaining stake via unlockNominator')

    // Check Bob's staked position before unlocking (should have pending withdrawals before)
    const bobBalanceBeforeUnlock = await balance(apis.consensus, bobAccount.address)

    // Unlock Bob's remaining stake
    await signAndSendTx(
      bobAccount,
      unlockNominator({
        api: apis.consensus,
        operatorId,
      }),
    )

    await waitForBlocks(apis.consensus, 1)
    const bobBalanceAfterUnlock = await balance(apis.consensus, bobAccount.address)
    expect(bobBalanceAfterUnlock.free).toBeGreaterThan(bobBalanceBeforeUnlock.free)

    const finalPos = await nominatorPosition(apis.consensus, operatorId, bobAccount.address)
    expect(finalPos.currentStakedValue).toBe(0n)
    expect(finalPos.totalShares).toBe(0n)
    expect(finalPos.pendingWithdrawals.length).toBe(0)
  }, 300000)
})
