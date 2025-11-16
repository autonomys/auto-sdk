import {
  deregisterOperator,
  events,
  nominateOperator,
  nominatorPosition,
  operator,
  operators,
  registerOperator,
  sudo,
  withdrawStake,
} from '@autonomys/auto-consensus'
import { generateWallet, signAndSendTx } from '@autonomys/auto-utils'
import { u8aToHex } from '@polkadot/util'
import { cleanupChains, setupChains, setupWallets, waitUntil } from '../../helpers'

const UNIT = 1_000_000_000_000_000_000n
const INITIAL_STAKE = 100n * UNIT
const MINIMUM_NOMINATOR_STAKE = 10n * UNIT
const ADDITIONAL_STAKE = 50n * UNIT
const DOMAIN_ID = '0'
const NOMINATION_TAX = '5'
const STAKE_AFTER_REGISTRATION = (INITIAL_STAKE * 80n) / 100n

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

    if (!foundOperator) throw new Error('Operator not found after registration')
    return foundOperator
  }

  const forceEpochTransition = async () => {
    const aliceAccount = wallets[0].accounts[0]
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
    const operatorWallet = generateWallet()
    if (!operatorWallet.keyringPair) throw new Error('Generated wallet missing keyringPair')
    const signingKeyHex = u8aToHex(operatorWallet.keyringPair.publicKey)

    const registerParams = {
      api: apis.consensus,
      domainId: DOMAIN_ID,
      amountToStake: INITIAL_STAKE.toString(),
      minimumNominatorStake: MINIMUM_NOMINATOR_STAKE.toString(),
      nominationTax: NOMINATION_TAX,
      publicKey: operatorWallet.keyringPair.publicKey,
    }

    await signAndSendTx(
      aliceAccount,
      registerOperator(registerParams),
      {},
      events.operatorRegistered,
    )

    const newlyRegistered = await waitForOperatorBySigningKey(signingKeyHex)
    expect(newlyRegistered.operatorDetails.currentTotalStake).toEqual(STAKE_AFTER_REGISTRATION)

    const operatorId = newlyRegistered.operatorId.toString()

    await forceEpochTransition()

    await waitUntil(async () => {
      const details = await operator(apis.consensus, operatorId)
      return details.currentTotalStake >= STAKE_AFTER_REGISTRATION
    })

    const beforeNomination = await operator(apis.consensus, operatorId)

    await signAndSendTx(
      aliceAccount,
      nominateOperator({
        api: apis.consensus,
        operatorId,
        amountToStake: ADDITIONAL_STAKE.toString(),
      }),
      {},
      events.operatorNominated,
    )

    await forceEpochTransition()

    await waitUntil(async () => {
      const details = await operator(apis.consensus, operatorId)
      return details.currentTotalStake > beforeNomination.currentTotalStake
    })

    await waitUntil(async () => {
      const position = await nominatorPosition(apis.consensus, operatorId, aliceAccount.address)
      return position.totalShares > 0n
    })

    const alicePosition = await nominatorPosition(apis.consensus, operatorId, aliceAccount.address)
    expect(alicePosition.totalShares).toBeGreaterThan(0n)
    expect(alicePosition.currentStakedValue).toBeGreaterThan(0n)

    const afterNomination = await operator(apis.consensus, operatorId)
    const shareQuotient = afterNomination.currentTotalShares / 10n
    const sharesToWithdraw = shareQuotient > 0n ? shareQuotient : afterNomination.currentTotalShares

    if (sharesToWithdraw <= 0n) {
      throw new Error('Unable to withdraw stake because no shares are available')
    }

    await signAndSendTx(
      aliceAccount,
      withdrawStake({
        api: apis.consensus,
        operatorId,
        shares: sharesToWithdraw.toString(),
      }),
      {},
      events.withdrawStake,
    )

    await forceEpochTransition()

    await signAndSendTx(
      aliceAccount,
      deregisterOperator({
        api: apis.consensus,
        operatorId,
      }),
      {},
      events.operatorDeregistered,
    )
  }, 300000)
})
