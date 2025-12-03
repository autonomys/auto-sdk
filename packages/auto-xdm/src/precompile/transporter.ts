/**
 * Transporter Precompile Helper Functions
 *
 * Provides high-level functions for interacting with the Transporter Precompile
 * on Auto-EVM domains. The precompile enables EVM users to transfer funds
 * to the consensus chain without using Substrate RPCs.
 *
 * @example
 * ```typescript
 * import { JsonRpcProvider, Wallet } from 'ethers'
 * import { transferToConsensus, getMinimumTransferAmount } from '@autonomys/auto-xdm'
 *
 * const provider = new JsonRpcProvider('https://auto-evm.mainnet.autonomys.xyz/ws')
 * const wallet = new Wallet(privateKey, provider)
 *
 * // Check minimum transfer amount
 * const minAmount = await getMinimumTransferAmount(provider)
 *
 * // Transfer 10 AI3 to a consensus account
 * const result = await transferToConsensus(
 *   wallet,
 *   'sufsKsx4kZ26i7bJXc1TFguysVzjkzsDtE2VDiCEBY2WjyGAj',
 *   10n * 10n ** 18n
 * )
 * ```
 *
 * @see https://github.com/autonomys/subspace/pull/3714
 */

import { decode } from '@autonomys/auto-utils'
import { TRANSPORTER_PRECOMPILE_ABI } from './abi'
import { TRANSPORTER_PRECOMPILE_ADDRESS } from './constants'
import type {
  EvmProvider,
  EvmSigner,
  TransferToConsensusOptions,
  TransferToConsensusResult,
} from './types'

/**
 * Encodes a Substrate AccountId32 address (SS58 format) to bytes32
 * for use with the transporter precompile.
 *
 * @param ss58Address - The SS58-encoded Substrate address
 * @returns The 32-byte hex string (0x-prefixed) representing the account
 *
 * @example
 * ```typescript
 * const bytes32 = encodeAccountId32ToBytes32('sufsKsx4kZ26i7bJXc1TFguysVzjkzsDtE2VDiCEBY2WjyGAj')
 * // Returns: '0x...' (64 hex characters)
 * ```
 */
export const encodeAccountId32ToBytes32 = (ss58Address: string): string => {
  const publicKeyBytes = decode(ss58Address)
  return (
    '0x' +
    Array.from(publicKeyBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  )
}

/**
 * Encodes function call data for minimum_transfer_amount()
 * @returns The encoded calldata
 */
const encodeMinimumTransferAmount = (): string => {
  // Function selector for minimum_transfer_amount()
  // keccak256("minimum_transfer_amount()") = 0x48a65e68
  return '0x48a65e68'
}

/**
 * Encodes function call data for transfer_to_consensus_v1(bytes32, uint256)
 * @param accountId32 - The bytes32 encoded account ID
 * @param amount - The amount to transfer
 * @returns The encoded calldata
 */
const encodeTransferToConsensusV1 = (accountId32: string, amount: bigint): string => {
  // Function selector for transfer_to_consensus_v1(bytes32,uint256)
  // keccak256("transfer_to_consensus_v1(bytes32,uint256)") = 0xedcd6515
  const selector = '0xedcd6515'

  // Encode accountId32 (already 32 bytes, remove 0x prefix)
  const encodedAccount = accountId32.slice(2).padStart(64, '0')

  // Encode amount as uint256 (32 bytes, hex)
  const encodedAmount = amount.toString(16).padStart(64, '0')

  return selector + encodedAccount + encodedAmount
}

/**
 * Gets the minimum transfer amount required by the precompile.
 *
 * @param provider - An ethers-compatible provider
 * @returns The minimum transfer amount in wei (as bigint)
 *
 * @example
 * ```typescript
 * const provider = new JsonRpcProvider('https://auto-evm.mainnet.autonomys.xyz/ws')
 * const minAmount = await getMinimumTransferAmount(provider)
 * console.log(`Minimum transfer: ${minAmount / 10n ** 18n} AI3`)
 * ```
 */
export const getMinimumTransferAmount = async (provider: EvmProvider): Promise<bigint> => {
  const result = await provider.call({
    to: TRANSPORTER_PRECOMPILE_ADDRESS,
    data: encodeMinimumTransferAmount(),
  })
  return BigInt(result)
}

/**
 * Checks if the transporter precompile is deployed at the expected address.
 *
 * The precompile is currently available on Chronos testnet and local dev nodes.
 * Mainnet support coming soon.
 *
 * @param provider - An ethers-compatible provider
 * @returns True if the precompile exists, false otherwise
 *
 * @example
 * ```typescript
 * const isDeployed = await isPrecompileDeployed(provider)
 * if (!isDeployed) {
 *   console.error('Transporter precompile not available on this network')
 * }
 * ```
 */
export const isPrecompileDeployed = async (provider: EvmProvider): Promise<boolean> => {
  try {
    await getMinimumTransferAmount(provider)
    return true
  } catch {
    return false
  }
}

/**
 * Transfers funds from an EVM domain to the consensus chain via the precompile.
 *
 * **Network Compatibility:** Currently available on Chronos testnet and local dev nodes.
 * Mainnet support coming soon. Use {@link isPrecompileDeployed} to check availability.
 *
 * @param signer - An ethers-compatible signer (wallet)
 * @param recipientSs58Address - The SS58-encoded recipient address on the consensus chain
 * @param amount - The amount to transfer in wei (1 AI3 = 10^18 wei)
 * @param options - Optional transaction parameters including:
 *   - `confirmations`: Number of blocks to wait (default: 1, set to 0 for fire-and-forget)
 *   - `gasLimit`, `maxFeePerGas`, `maxPriorityFeePerGas`: EIP-1559 gas options
 * @returns The transaction result. When `confirmations: 0`, returns immediately with
 *   `blockNumber: 0` and `gasUsed: 0n` since the tx hasn't been mined yet.
 *
 * @throws Error if the transaction fails or is dropped
 *
 * @example
 * ```typescript
 * // Wait for 1 confirmation (default)
 * const result = await transferToConsensus(wallet, recipient, amount)
 *
 * // Fire-and-forget (don't wait for confirmation)
 * const result = await transferToConsensus(wallet, recipient, amount, { confirmations: 0 })
 * ```
 */
export const transferToConsensus = async (
  signer: EvmSigner,
  recipientSs58Address: string,
  amount: bigint,
  options: TransferToConsensusOptions = {},
): Promise<TransferToConsensusResult> => {
  const { confirmations = 1, ...txOptions } = options

  const accountId32 = encodeAccountId32ToBytes32(recipientSs58Address)
  const data = encodeTransferToConsensusV1(accountId32, amount)

  const txResponse = await signer.sendTransaction({
    to: TRANSPORTER_PRECOMPILE_ADDRESS,
    data,
    ...txOptions,
  })

  if (confirmations === 0) {
    return {
      transactionHash: txResponse.hash,
      blockNumber: 0,
      blockHash: '',
      gasUsed: BigInt(0),
      effectiveGasPrice: BigInt(0),
      success: true,
    }
  }

  const receipt = await txResponse.wait(confirmations)

  if (!receipt) {
    throw new Error('Transaction was dropped or replaced')
  }

  return {
    transactionHash: txResponse.hash,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    gasUsed: receipt.gasUsed,
    effectiveGasPrice: receipt.effectiveGasPrice ?? BigInt(0),
    success: receipt.status === 1,
  }
}

/**
 * Creates the raw transaction data for a transfer to consensus.
 * Useful for gas estimation, batching, or using with other transaction builders.
 *
 * @param recipientSs58Address - The SS58-encoded recipient address on the consensus chain
 * @param amount - The amount to transfer in wei
 * @returns An object with `to` address and encoded `data`
 *
 * @example
 * ```typescript
 * const txData = createTransferToConsensusTxData(
 *   'sufsKsx4kZ26i7bJXc1TFguysVzjkzsDtE2VDiCEBY2WjyGAj',
 *   10n * 10n ** 18n
 * )
 *
 * // Use for gas estimation
 * const gasEstimate = await provider.estimateGas(txData)
 *
 * // Or use with a contract wallet
 * await contractWallet.execute(txData.to, 0, txData.data)
 * ```
 */
export const createTransferToConsensusTxData = (
  recipientSs58Address: string,
  amount: bigint,
): { to: string; data: string } => {
  const accountId32 = encodeAccountId32ToBytes32(recipientSs58Address)
  const data = encodeTransferToConsensusV1(accountId32, amount)

  return {
    to: TRANSPORTER_PRECOMPILE_ADDRESS,
    data,
  }
}

/**
 * Returns the ABI for the Transporter Precompile.
 * Useful when you want to create your own ethers Contract instance.
 *
 * @returns The ABI array
 *
 * @example
 * ```typescript
 * import { Contract } from 'ethers'
 * import { getTransporterPrecompileAbi, TRANSPORTER_PRECOMPILE_ADDRESS } from '@autonomys/auto-xdm'
 *
 * const contract = new Contract(
 *   TRANSPORTER_PRECOMPILE_ADDRESS,
 *   getTransporterPrecompileAbi(),
 *   signer
 * )
 *
 * await contract.transfer_to_consensus_v1(accountId32, amount)
 * ```
 */
export const getTransporterPrecompileAbi = () => TRANSPORTER_PRECOMPILE_ABI
