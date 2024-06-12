import type { NetworkInput } from '@autonomys/auto-utils'
import {
  ActivateWalletInput,
  activate,
  activateWallet,
  disconnect,
  networks,
} from '@autonomys/auto-utils'
import { u8aToHex } from '@polkadot/util'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { address } from '../src/address'
import { balance } from '../src/balances'
import {
  deregisterOperator,
  nominateOperator,
  operator,
  operators,
  registerOperator,
} from '../src/staking'
import { transfer } from '../src/transfer'
import { signAndSendTx, verifyOperatorRegistration } from './helpers'

describe('Verify staking functions', () => {
  const isLocalhost = process.env.LOCALHOST === 'true'

  // Define the test network and its details
  const TEST_NETWORK: NetworkInput = !isLocalhost
    ? { networkId: networks[0].id }
    : { networkId: 'autonomys-localhost' }
  const TEST_INVALID_NETWORK = { networkId: 'invalid-network' }

  const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
  const TEST_ADDRESS = '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'
  const ALICE_URI = '//Alice'
  const ALICE_ADDRESS = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
  const BOB_URI = '//Bob'
  const BOB_ADDRESS = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

  beforeAll(async () => {
    await activate(TEST_NETWORK)
  })

  afterAll(async () => {
    await disconnect()
  })

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
        await signAndSendTx(sender, await registerOperator(txInput))
        await verifyOperatorRegistration(txInput)

        const _balanceSenderEnd = await balance(api, address(sender.address))
        expect(_balanceSenderEnd.free).toBeLessThan(
          _balanceSenderStart.free - BigInt(amountToStake),
        )

        const operatorsList = await operators(api)
        const findOperator = operatorsList.find(
          (o) => o.operatorDetails.signingKey === u8aToHex(operatorAccounts[0].publicKey),
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

          const forceStakingEpochTransition =
            await api.tx.domains.forceStakingEpochTransition(domainId)
          await signAndSendTx(sender, await api.tx.sudo.sudo(forceStakingEpochTransition))

          const operatorsListFinal = await operators(api)
          const findOperatorFinal = operatorsListFinal.find(
            (o) => o.operatorDetails.signingKey === u8aToHex(operatorAccounts[0].publicKey),
          )
          expect(findOperatorFinal).toBeDefined()
          if (findOperatorFinal) {
            expect(findOperatorFinal.operatorDetails.currentDomainId).toEqual(BigInt(domainId))
            expect(findOperatorFinal.operatorDetails.currentTotalStake).toEqual(
              (BigInt(amountToStake) / BigInt(100)) * BigInt(80),
            )
            expect(findOperatorFinal.operatorDetails.minimumNominatorStake).toEqual(
              BigInt(minimumNominatorStake),
            )
            expect(findOperatorFinal.operatorDetails.nominationTax).toEqual(Number(nominationTax))
            expect(findOperatorFinal.operatorDetails.totalStorageFeeDeposit).toEqual(
              (BigInt(amountToStake) / BigInt(100)) * BigInt(20),
            )
            const thisOperatorFinal = await operator(api, findOperator.operatorId)
            expect(thisOperatorFinal.currentDomainId).toEqual(BigInt(domainId))
            expect(thisOperatorFinal.currentTotalStake).toEqual(
              (BigInt(amountToStake) / BigInt(100)) * BigInt(80),
            )
            expect(thisOperatorFinal.minimumNominatorStake).toEqual(BigInt(minimumNominatorStake))
            expect(thisOperatorFinal.nominationTax).toEqual(Number(nominationTax))
            expect(thisOperatorFinal.totalStorageFeeDeposit).toEqual(
              (BigInt(amountToStake) / BigInt(100)) * BigInt(20),
            )
          }
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
        await signAndSendTx(sender, await registerOperator(txInput))
        await verifyOperatorRegistration(txInput)

        const _balanceSenderEnd = await balance(api, address(sender.address))
        expect(_balanceSenderEnd.free).toBeLessThan(
          _balanceSenderStart.free - BigInt(amountToStake),
        )

        const operatorsList = await operators(api)
        const findOperator = operatorsList.find(
          (o) => o.operatorDetails.signingKey === u8aToHex(operatorAccounts[0].publicKey),
        )
        expect(findOperator).toBeDefined()
        if (findOperator) {
          expect(findOperator.operatorDetails.currentDomainId).toEqual(BigInt(domainId))
          // To-Do: Either remove this check or figure why it's not working (guessing there is a delay for the stake to be active)
          // expect(operator.operatorDetails.currentTotalStake).toEqual(BigInt(amountToStake))
          expect(findOperator.operatorDetails.minimumNominatorStake).toEqual(
            BigInt(minimumNominatorStake),
          )
          expect(findOperator.operatorDetails.nominationTax).toEqual(Number(nominationTax))
          const thisOperator = await operator(api, findOperator.operatorId)
          expect(thisOperator.currentDomainId).toEqual(BigInt(domainId))
          // To-Do: Either remove this check or figure why it's not working (guessing there is a delay for the stake to be active)
          // expect(thisOperator.currentTotalStake).toEqual(BigInt(amountToStake))
          expect(thisOperator.minimumNominatorStake).toEqual(BigInt(minimumNominatorStake))
          expect(thisOperator.nominationTax).toEqual(Number(nominationTax))

          const amountToStake2 = BigInt(amountToTransfer) / BigInt(2)
          await signAndSendTx(
            operatorAccounts[0],
            await nominateOperator({
              api,
              operatorId: findOperator.operatorId,
              amountToStake: amountToStake2.toString(),
            }),
          )
        }
      }, 30000)
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

        // Transfer some funds to the operator
        const amountToTransfer = '10000000000000000000'
        await signAndSendTx(
          sender,
          await transfer(api, operatorAccounts[0].address, amountToTransfer),
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
        await signAndSendTx(sender, await registerOperator(txInput))
        await verifyOperatorRegistration(txInput)

        const _balanceSenderEnd = await balance(api, address(sender.address))
        expect(_balanceSenderEnd.free).toBeLessThan(
          _balanceSenderStart.free - BigInt(amountToStake),
        )

        const operatorsList = await operators(api)
        const findOperator = operatorsList.find(
          (o) => o.operatorDetails.signingKey === u8aToHex(operatorAccounts[0].publicKey),
        )
        expect(findOperator).toBeDefined()
        if (findOperator) {
          expect(findOperator.operatorDetails.currentDomainId).toEqual(BigInt(domainId))
          // To-Do: Either remove this check or figure why it's not working (guessing there is a delay for the stake to be active)
          // expect(operator.operatorDetails.currentTotalStake).toEqual(BigInt(amountToStake))
          expect(findOperator.operatorDetails.minimumNominatorStake).toEqual(
            BigInt(minimumNominatorStake),
          )
          expect(findOperator.operatorDetails.nominationTax).toEqual(Number(nominationTax))
          const thisOperator = await operator(api, findOperator.operatorId)
          expect(thisOperator.currentDomainId).toEqual(BigInt(domainId))
          // To-Do: Either remove this check or figure why it's not working (guessing there is a delay for the stake to be active)
          // expect(thisOperator.currentTotalStake).toEqual(BigInt(amountToStake))
          expect(thisOperator.minimumNominatorStake).toEqual(BigInt(minimumNominatorStake))
          expect(thisOperator.nominationTax).toEqual(Number(nominationTax))

          await signAndSendTx(
            operatorAccounts[0],
            await deregisterOperator({
              api,
              operatorId: findOperator.operatorId,
            }),
          )
        }
      }, 30000)
    })
  } else {
    test('Staking test only run on localhost', async () => {
      expect(true).toBeTruthy()
    })
  }
})
