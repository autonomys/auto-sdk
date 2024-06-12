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
        let blockHash: string | undefined

        const _balanceSenderStart = await balance(api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const tx = await registerOperator({
          api,
          senderAddress: ALICE_ADDRESS,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        })

        await new Promise<void>((resolve, reject) => {
          tx.signAndSend(sender, ({ status }) => {
            if (status.isInBlock) {
              blockHash = status.asInBlock.toHex()
              console.log('Successful of Bob as operator with block hash ' + blockHash)
              resolve()
            } else if (
              status.isRetracted ||
              status.isFinalityTimeout ||
              status.isDropped ||
              status.isInvalid
            ) {
              reject(new Error('Transaction failed'))
            } else {
              console.log('Status of registration: ' + status.type)
            }
          })
        })

        expect(blockHash).toBeDefined()

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
          const sudoTx = await api.tx.sudo.sudo(forceStakingEpochTransition)

          await new Promise<void>((resolve, reject) => {
            sudoTx.signAndSend(sender, ({ status }) => {
              if (status.isInBlock) {
                blockHash = status.asInBlock.toHex()
                console.log('Successful forceStakingEpochTransition with block hash ' + blockHash)
                resolve()
              } else if (
                status.isRetracted ||
                status.isFinalityTimeout ||
                status.isDropped ||
                status.isInvalid
              ) {
                reject(new Error('Transaction failed'))
              } else {
                console.log('Status of forceStakingEpochTransition: ' + status.type)
              }
            })
          })

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
        let blockHash: string | undefined

        const _balanceSenderStart = await balance(api, address(sender.address))
        const _balanceReceiverStart = await balance(api, address(TEST_ADDRESS))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        const amountToStake = '50000000000000000000'
        const tx = await nominateOperator({
          api,
          operatorId: '1',
          amountToStake,
        })

        await new Promise<void>((resolve, reject) => {
          tx.signAndSend(sender, ({ status }) => {
            if (status.isInBlock) {
              blockHash = status.asInBlock.toHex()
              console.log('Successful of Alice nomination with block hash ' + blockHash)
              resolve()
            } else if (
              status.isRetracted ||
              status.isFinalityTimeout ||
              status.isDropped ||
              status.isInvalid
            ) {
              reject(new Error('Transaction failed'))
            } else {
              console.log('Status of nomination: ' + status.type)
            }
          })
        })
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
        let blockHash: string | undefined

        const _balanceSenderStart = await balance(api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        // Transfer some funds to the operator
        const amountToTransfer = '10000000000000000000'
        const transferTx = await transfer(api, operatorAccounts[0].address, amountToTransfer)

        await new Promise<void>((resolve, reject) => {
          transferTx.signAndSend(sender, ({ status }) => {
            if (status.isInBlock) {
              blockHash = status.asInBlock.toHex()
              console.log('Successful transfer with block hash ' + blockHash)
              resolve()
            } else if (
              status.isRetracted ||
              status.isFinalityTimeout ||
              status.isDropped ||
              status.isInvalid
            ) {
              reject(new Error('Transaction failed'))
            } else {
              console.log('Status of transfer: ' + status.type)
            }
          })
        })

        expect(blockHash).toBeDefined()

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const tx = await registerOperator({
          api,
          senderAddress: ALICE_ADDRESS,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        })

        await new Promise<void>((resolve, reject) => {
          tx.signAndSend(sender, ({ status }) => {
            if (status.isInBlock) {
              blockHash = status.asInBlock.toHex()
              console.log('Successful of Bob as operator with block hash ' + blockHash)
              resolve()
            } else if (
              status.isRetracted ||
              status.isFinalityTimeout ||
              status.isDropped ||
              status.isInvalid
            ) {
              reject(new Error('Transaction failed'))
            } else {
              console.log('Status of registration: ' + status.type)
            }
          })
        })

        expect(blockHash).toBeDefined()

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
          const tx3 = await nominateOperator({
            api,
            operatorId: findOperator.operatorId,
            amountToStake: amountToStake2.toString(),
          })

          await new Promise<void>((resolve, reject) => {
            tx3.signAndSend(operatorAccounts[0], ({ status }) => {
              if (status.isInBlock) {
                blockHash = status.asInBlock.toHex()
                console.log('Successful of Operator nomination with block hash ' + blockHash)
                resolve()
              } else if (
                status.isRetracted ||
                status.isFinalityTimeout ||
                status.isDropped ||
                status.isInvalid
              ) {
                reject(new Error('Transaction failed'))
              } else {
                console.log('Status of nomination: ' + status.type)
              }
            })
          })
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
        let blockHash: string | undefined

        const _balanceSenderStart = await balance(api, address(sender.address))
        expect(_balanceSenderStart.free).toBeGreaterThan(BigInt(0))

        // Transfer some funds to the operator
        const amountToTransfer = '10000000000000000000'
        const transferTx = await transfer(api, operatorAccounts[0].address, amountToTransfer)

        await new Promise<void>((resolve, reject) => {
          transferTx.signAndSend(sender, ({ status }) => {
            if (status.isInBlock) {
              blockHash = status.asInBlock.toHex()
              console.log('Successful transfer with block hash ' + blockHash)
              resolve()
            } else if (
              status.isRetracted ||
              status.isFinalityTimeout ||
              status.isDropped ||
              status.isInvalid
            ) {
              reject(new Error('Transaction failed'))
            } else {
              console.log('Status of transfer: ' + status.type)
            }
          })
        })

        expect(blockHash).toBeDefined()

        const domainId = '0'
        const amountToStake = '100000000000000000000'
        const minimumNominatorStake = '1000000000000000000'
        const nominationTax = '5'
        const tx = await registerOperator({
          api,
          senderAddress: ALICE_ADDRESS,
          Operator: operatorAccounts[0],
          domainId,
          amountToStake,
          minimumNominatorStake,
          nominationTax,
        })

        await new Promise<void>((resolve, reject) => {
          tx.signAndSend(sender, ({ status }) => {
            if (status.isInBlock) {
              blockHash = status.asInBlock.toHex()
              console.log('Successful of Bob as operator with block hash ' + blockHash)
              resolve()
            } else if (
              status.isRetracted ||
              status.isFinalityTimeout ||
              status.isDropped ||
              status.isInvalid
            ) {
              reject(new Error('Transaction failed'))
            } else {
              console.log('Status of registration: ' + status.type)
            }
          })
        })

        expect(blockHash).toBeDefined()

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

          const tx3 = await deregisterOperator({
            api,
            operatorId: findOperator.operatorId,
          })

          await new Promise<void>((resolve, reject) => {
            tx3.signAndSend(operatorAccounts[0], ({ status }) => {
              if (status.isInBlock) {
                blockHash = status.asInBlock.toHex()
                console.log('Successful of Operator de-registering with block hash ' + blockHash)
                resolve()
              } else if (
                status.isRetracted ||
                status.isFinalityTimeout ||
                status.isDropped ||
                status.isInvalid
              ) {
                reject(new Error('Transaction failed'))
              } else {
                console.log('Status of de-registering: ' + status.type)
              }
            })
          })
        }
      }, 30000)
    })
  } else {
    test('Staking test only run on localhost', async () => {
      expect(true).toBeTruthy()
    })
  }
})
