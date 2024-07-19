import {
  balance,
  deregisterOperator,
  events,
  nominateOperator,
  operator,
  registerOperator,
  sudo,
  withdrawStake,
} from '@autonomys/auto-consensus'
import type { ApiPromise, WalletActivated } from '@autonomys/auto-utils'
import {
  ActivateWalletParams,
  activate,
  activateWallet,
  address,
  disconnect,
  generateWallet,
  mockWallets,
} from '@autonomys/auto-utils'
import {
  setup,
  signAndSendTx,
  verifyOperatorRegistration,
  verifyOperatorRegistrationFinal,
} from './helpers'

describe('Verify staking functions', () => {
  const { isLocalhost, TEST_NETWORK } = setup()

  let wallets: WalletActivated[] = []
  let api: ApiPromise

  beforeAll(async () => {
    api = await activate(TEST_NETWORK)
    wallets = await mockWallets(TEST_NETWORK, api)
  }, 15000)

  afterAll(async () => {
    await disconnect(api)
  }, 10000)

  if (isLocalhost) {
    describe('Test registerOperator()', () => {
      test('Check Alice can register random wallet as an operator', async () => {
        const { mnemonic } = generateWallet()
        const { accounts: operatorAccounts } = await activateWallet({
          ...TEST_NETWORK,
          mnemonic,
        } as ActivateWalletParams)

        const alice = wallets[0]
        const sender = alice.accounts[0]
        const _balanceSenderStart = await balance(alice.api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const txParams = {
          api: alice.api,
          senderAddress: sender.address,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        }
        const tx = await registerOperator(txParams)
        await signAndSendTx(sender, tx, [events.operatorRegistered])
        const findOperator = await verifyOperatorRegistration(txParams)
        const _balanceSenderEnd = await balance(alice.api, address(sender.address))
        expect(_balanceSenderEnd.free).toBeLessThan(
          _balanceSenderStart.free - BigInt(amountToStake),
        )
        if (findOperator) {
          await sudo(
            alice.api,
            sender,
            await alice.api.tx.domains.forceStakingEpochTransition(domainId),
            {},
            [events.forceDomainEpochTransition],
          )
          await verifyOperatorRegistrationFinal(txParams)
        }
      }, 30000)
    })

    describe('Test nominateOperator()', () => {
      test('Check Alice can nominate OperatorId 1', async () => {
        const alice = wallets[0]
        const sender = alice.accounts[0]
        const _balanceSenderStart = await balance(alice.api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const amountToStake = '50000000000000000000'
        await signAndSendTx(
          sender,
          await nominateOperator({
            api: alice.api,
            operatorId: '1',
            amountToStake,
          }),
          [events.operatorNominated],
        )
      }, 15000)

      test('Check Operator can addFunds after registration', async () => {
        const { mnemonic } = generateWallet()
        const { accounts: operatorAccounts } = await activateWallet({
          ...TEST_NETWORK,
          mnemonic,
        } as ActivateWalletParams)

        const alice = wallets[0]
        const sender = alice.accounts[0]

        const _balanceSenderStart = await balance(alice.api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const txParams = {
          api: alice.api,
          senderAddress: sender.address,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        }
        await signAndSendTx(sender, await registerOperator(txParams), [events.operatorRegistered])
        await verifyOperatorRegistration(txParams)

        await sudo(
          alice.api,
          sender,
          await alice.api.tx.domains.forceStakingEpochTransition(domainId),
          {},
          [events.forceDomainEpochTransition],
        )
        const operator = await verifyOperatorRegistrationFinal(txParams)

        if (operator) {
          const amountToAdd = '50000000000000000000'
          await signAndSendTx(
            sender,
            await nominateOperator({
              api: alice.api,
              operatorId: operator.operatorId,
              amountToStake: amountToAdd,
            }),
            [events.operatorNominated],
          )
        } else throw new Error('Operator not found')
      }, 180000)
    })

    describe('Test deregisterOperator()', () => {
      test('Check Operator can deregisterOperator after registration', async () => {
        const { mnemonic } = generateWallet()
        const { accounts: operatorAccounts } = await activateWallet({
          ...TEST_NETWORK,
          mnemonic,
        } as ActivateWalletParams)

        const alice = wallets[0]
        const sender = alice.accounts[0]

        const _balanceSenderStart = await balance(alice.api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const txParams = {
          api: alice.api,
          senderAddress: sender.address,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        }
        await signAndSendTx(sender, await registerOperator(txParams), [events.operatorRegistered])
        await verifyOperatorRegistration(txParams)

        await sudo(
          alice.api,
          sender,
          await alice.api.tx.domains.forceStakingEpochTransition(domainId),
          {},
          [events.forceDomainEpochTransition],
        )
        const findOperator = await verifyOperatorRegistrationFinal(txParams)

        if (findOperator) {
          await signAndSendTx(
            sender,
            await deregisterOperator({
              api: alice.api,
              operatorId: findOperator.operatorId,
            }),
            [events.operatorDeregistered],
          )
        }
      }, 60000)
    })

    describe('Test withdrawStake()', () => {
      test('Check Alice can nominate OperatorId 1 and then withdrawStake', async () => {
        const alice = wallets[0]
        const sender = alice.accounts[0]
        const _balanceSenderStart = await balance(alice.api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const operatorId = '1'
        const operatorDetails = await operator(alice.api, operatorId)

        const amountToStake = '50000000000000000000'
        await signAndSendTx(
          sender,
          await nominateOperator({
            api: alice.api,
            operatorId,
            amountToStake,
          }),
          [events.operatorNominated],
        )

        await sudo(
          alice.api,
          sender,
          await alice.api.tx.domains.forceStakingEpochTransition(operatorDetails.currentDomainId),
          {},
          [events.forceDomainEpochTransition],
        )

        await signAndSendTx(
          sender,
          await withdrawStake({
            api: alice.api,
            operatorId,
            shares: operatorDetails.currentTotalShares / BigInt(1000),
          }),
          [events.withdrawStake],
        )
      }, 30000)
    })
  } else {
    test('Staking test only run on localhost', async () => {
      expect(true).toBeTruthy()
    })
  }
})
