import {
  address,
  balance,
  deregisterOperator,
  events,
  nominateOperator,
  operator,
  registerOperator,
  sudo,
  withdrawStake,
} from '@autonomys/auto-consensus'
import { ActivateWalletInput, activateWallet, getMockWallet } from '@autonomys/auto-utils'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import {
  setup,
  signAndSendTx,
  verifyOperatorRegistration,
  verifyOperatorRegistrationFinal,
} from './helpers'

describe('Verify staking functions', () => {
  const { isLocalhost, TEST_NETWORK, wallets } = setup()

  const alice = getMockWallet('Alice', wallets)

  if (isLocalhost) {
    describe('Test registerOperator()', () => {
      test('Check Alice can register random wallet as an operator', async () => {
        const mnemonicOperator = mnemonicGenerate()
        const { accounts: operatorAccounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: mnemonicOperator,
        } as ActivateWalletInput)

        const sender = alice.accounts[0]
        const _balanceSenderStart = await balance(alice.api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const txInput = {
          api: alice.api,
          senderAddress: sender.address,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        }
        await signAndSendTx(sender, await registerOperator(txInput), [events.operatorRegistered])
        const findOperator = await verifyOperatorRegistration(txInput)

        const _balanceSenderEnd = await balance(alice.api, address(sender.address))
        expect(_balanceSenderEnd.free).toBeLessThan(
          _balanceSenderStart.free - BigInt(amountToStake),
        )
        if (findOperator) {
          await sudo(
            alice.api,
            sender,
            await alice.api.tx.domains.forceStakingEpochTransition(domainId),
            [events.forceDomainEpochTransition],
          )
          await verifyOperatorRegistrationFinal(txInput)
        }
      }, 30000)
    })

    describe('Test nominateOperator()', () => {
      test('Check Alice can nominate OperatorId 1', async () => {
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
      }, 10000)

      test('Check Operator can addFunds after registration', async () => {
        const mnemonicOperator = mnemonicGenerate()
        const { accounts: operatorAccounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: mnemonicOperator,
        } as ActivateWalletInput)

        const sender = alice.accounts[0]

        const _balanceSenderStart = await balance(alice.api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const txInput = {
          api: alice.api,
          senderAddress: sender.address,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        }
        await signAndSendTx(sender, await registerOperator(txInput), [events.operatorRegistered])
        await verifyOperatorRegistration(txInput)

        await sudo(
          alice.api,
          sender,
          await alice.api.tx.domains.forceStakingEpochTransition(domainId),
          [events.forceDomainEpochTransition],
        )
        const operator = await verifyOperatorRegistrationFinal(txInput)

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
        const mnemonicOperator = mnemonicGenerate()
        const { accounts: operatorAccounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: mnemonicOperator,
        } as ActivateWalletInput)

        const sender = alice.accounts[0]

        const _balanceSenderStart = await balance(alice.api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const txInput = {
          api: alice.api,
          senderAddress: sender.address,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        }
        await signAndSendTx(sender, await registerOperator(txInput), [events.operatorRegistered])
        await verifyOperatorRegistration(txInput)

        await sudo(
          alice.api,
          sender,
          await alice.api.tx.domains.forceStakingEpochTransition(domainId),
          [events.forceDomainEpochTransition],
        )
        const findOperator = await verifyOperatorRegistrationFinal(txInput)

        if (findOperator) {
          await signAndSendTx(
            sender,
            await deregisterOperator({
              api: alice.api,
              operatorId: findOperator.operatorId,
            }),
            [events.operatorDeRegistered],
          )
        }
      }, 60000)
    })

    describe('Test withdrawStake()', () => {
      test('Check Alice can nominate OperatorId 1 and then withdrawStake', async () => {
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
