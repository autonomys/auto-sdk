import { ActivateWalletInput, activateWallet } from '@autonomys/auto-utils'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { address } from '../src/address'
import { balance } from '../src/balances'
import {
  deregisterOperator,
  nominateOperator,
  operator,
  registerOperator,
  unlockFunds,
  withdrawStake,
} from '../src/staking'
import { transfer } from '../src/transfer'
import {
  events,
  setup,
  signAndSendTx,
  sudo,
  verifyOperatorRegistration,
  verifyOperatorRegistrationFinal,
} from './helpers'

describe('Verify staking functions', () => {
  const { isLocalhost, TEST_NETWORK, ALICE_URI, ALICE_ADDRESS } = setup()

  if (isLocalhost) {
    describe('Test registerOperator()', () => {
      test('Check Alice can register random wallet as an operator', async () => {
        const mnemonicOperator = mnemonicGenerate()
        const { api, accounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: ALICE_URI,
        } as ActivateWalletInput)
        const { accounts: operatorAccounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: mnemonicOperator,
        } as ActivateWalletInput)
        expect(accounts.length).toBeGreaterThan(0)
        expect(accounts[0].address).toEqual(ALICE_ADDRESS)

        const sender = accounts[0]
        const _balanceSenderStart = await balance(api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const txInput = {
          api,
          senderAddress: ALICE_ADDRESS,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        }
        await signAndSendTx(sender, await registerOperator(txInput), [events.operatorRegistered])
        const findOperator = await verifyOperatorRegistration(txInput)

        const _balanceSenderEnd = await balance(api, address(sender.address))
        expect(_balanceSenderEnd.free).toBeLessThan(
          _balanceSenderStart.free - BigInt(amountToStake),
        )
        if (findOperator) {
          await sudo(api, sender, await api.tx.domains.forceStakingEpochTransition(domainId), [
            events.forceDomainEpochTransition,
          ])
          await verifyOperatorRegistrationFinal(txInput)
        }
      }, 30000)
    })

    describe('Test nominateOperator()', () => {
      test('Check Alice can nominate OperatorId 1', async () => {
        const { api, accounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: ALICE_URI,
        } as ActivateWalletInput)
        expect(accounts.length).toBeGreaterThan(0)
        expect(accounts[0].address).toEqual(ALICE_ADDRESS)

        const sender = accounts[0]
        const _balanceSenderStart = await balance(api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const amountToStake = '50000000000000000000'
        await signAndSendTx(
          sender,
          await nominateOperator({
            api,
            operatorId: '1',
            amountToStake,
          }),
          [events.operatorNominated],
        )
      }, 10000)

      test('Check Operator can addFunds after registration', async () => {
        const mnemonicOperator = mnemonicGenerate()
        const { api, accounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: ALICE_URI,
        } as ActivateWalletInput)
        const { accounts: operatorAccounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: mnemonicOperator,
        } as ActivateWalletInput)
        expect(accounts.length).toBeGreaterThan(0)
        expect(accounts[0].address).toEqual(ALICE_ADDRESS)

        const sender = accounts[0]

        const _balanceSenderStart = await balance(api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        // Transfer some funds to the operator
        const amountToTransfer = '10000000000000000000'
        await signAndSendTx(
          sender,
          await transfer(api, operatorAccounts[0].address, amountToTransfer),
          [events.transfer],
        )

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const txInput = {
          api,
          senderAddress: ALICE_ADDRESS,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        }
        await signAndSendTx(sender, await registerOperator(txInput), [events.operatorRegistered])
        await verifyOperatorRegistration(txInput)

        const _balanceSenderEnd = await balance(api, address(sender.address))
        expect(_balanceSenderEnd.free).toBeLessThan(
          _balanceSenderStart.free - BigInt(amountToStake),
        )

        await sudo(api, sender, await api.tx.domains.forceStakingEpochTransition(domainId), [
          events.forceDomainEpochTransition,
        ])
        const operator = await verifyOperatorRegistrationFinal(txInput)

        if (operator) {
          const amountToAdd = '50000000000000000000'
          await signAndSendTx(
            operatorAccounts[0],
            await nominateOperator({
              api,
              operatorId: operator?.operatorId,
              amountToStake: amountToAdd,
            }),
            [events.operatorNominated],
          )
        } else throw new Error('Operator not found')
      }, 120000)
    })

    describe('Test deregisterOperator()', () => {
      test('Check Operator can deregisterOperator after registration', async () => {
        const mnemonicOperator = mnemonicGenerate()
        const { api, accounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: ALICE_URI,
        } as ActivateWalletInput)
        const { accounts: operatorAccounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: mnemonicOperator,
        } as ActivateWalletInput)
        expect(accounts.length).toBeGreaterThan(0)
        expect(accounts[0].address).toEqual(ALICE_ADDRESS)

        const sender = accounts[0]

        const _balanceSenderStart = await balance(api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const txInput = {
          api,
          senderAddress: ALICE_ADDRESS,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        }
        await signAndSendTx(sender, await registerOperator(txInput), [events.operatorRegistered])
        await verifyOperatorRegistration(txInput)

        await sudo(api, sender, await api.tx.domains.forceStakingEpochTransition(domainId), [
          events.forceDomainEpochTransition,
        ])
        const findOperator = await verifyOperatorRegistrationFinal(txInput)

        if (findOperator) {
          await signAndSendTx(
            sender,
            await deregisterOperator({
              api,
              operatorId: findOperator.operatorId,
            }),
            [events.operatorDeRegistered],
          )
        }
      }, 60000)
    })

    describe('Test withdrawStake()', () => {
      test('Check Alice can nominate OperatorId 1 and then withdrawStake', async () => {
        const { api, accounts } = await activateWallet({
          ...TEST_NETWORK,
          uri: ALICE_URI,
        } as ActivateWalletInput)
        expect(accounts.length).toBeGreaterThan(0)
        expect(accounts[0].address).toEqual(ALICE_ADDRESS)

        const sender = accounts[0]
        const _balanceSenderStart = await balance(api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const operatorId = '1'
        const operatorDetails = await operator(api, operatorId)

        const amountToStake = '50000000000000000000'
        await signAndSendTx(
          sender,
          await nominateOperator({
            api,
            operatorId,
            amountToStake,
          }),
          [events.operatorNominated],
        )

        await sudo(
          api,
          sender,
          await api.tx.domains.forceStakingEpochTransition(operatorDetails.currentDomainId),
          [events.forceDomainEpochTransition],
        )

        await signAndSendTx(
          sender,
          await withdrawStake({
            api,
            operatorId,
            shares: operatorDetails.currentTotalShares / BigInt(1000),
          }),
          [events.withdrawStake],
        )
      }, 30000)
    })

    // Still unsure if this is testable due to the lock period of 2 days
    // describe('Test unlockFunds()', () => {
    //   test('Check Operator can unlockFunds after registration', async () => {
    //     const mnemonicOperator = mnemonicGenerate()
    //     const { api, accounts } = await activateWallet({
    //       ...TEST_NETWORK,
    //       uri: ALICE_URI,
    //     } as ActivateWalletInput)
    //     const { accounts: operatorAccounts } = await activateWallet({
    //       ...TEST_NETWORK,
    //       uri: mnemonicOperator,
    //     } as ActivateWalletInput)
    //     expect(accounts.length).toBeGreaterThan(0)
    //     expect(accounts[0].address).toEqual(ALICE_ADDRESS)

    //     const sender = accounts[0]

    //     const _balanceSenderStart = await balance(api, address(sender.address))
    //     expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

    //     // Transfer some funds to the operator
    //     const amountToTransfer = '10000000000000000000'
    //     await signAndSendTx(
    //       sender,
    //       await transfer(api, operatorAccounts[0].address, amountToTransfer),
    //      [events.transfer]
    //     )

    //     const domainId = '0'
    //     const amountToStake = '100000000000000000000'
    //     const minimumNominatorStake = '1000000000000000000'
    //     const nominationTax = '5'
    //     const txInput = {
    //       api,
    //       senderAddress: ALICE_ADDRESS,
    //       Operator: operatorAccounts[0],
    //       domainId,
    //       amountToStake,
    //       minimumNominatorStake,
    //       nominationTax,
    //     }
    //     await signAndSendTx(sender, await registerOperator(txInput), [events.operatorRegistered])
    //     await verifyOperatorRegistration(txInput)

    //     const _balanceSenderEnd = await balance(api, address(sender.address))
    //     expect(_balanceSenderEnd.free).toBeLessThan(
    //       _balanceSenderStart.free - BigInt(amountToStake),
    //     )

    //     await sudo(api, sender, await api.tx.domains.forceStakingEpochTransition(domainId), [events.forceDomainEpochTransition])
    //     const findOperator = await verifyOperatorRegistrationFinal(txInput)

    //     if (findOperator) {
    //       await signAndSendTx(
    //         sender,
    //         await unlockFunds({
    //           api,
    //           operatorId: findOperator.operatorId,
    //         }),
    //         [events.operatorDeRegistered],
    //       )
    //     }
    //   }, 30000)
    // })
  } else {
    test('Staking test only run on localhost', async () => {
      expect(true).toBeTruthy()
    })
  }
})
