/**
 * Types for Transporter Precompile interactions
 */

/**
 * Options for transfer transactions
 */
export type TransferToConsensusOptions = {
  /** Gas limit override (default: estimated automatically) */
  gasLimit?: bigint
  /** Max fee per gas in wei (EIP-1559) */
  maxFeePerGas?: bigint
  /** Max priority fee per gas in wei (EIP-1559) */
  maxPriorityFeePerGas?: bigint
  /** Number of confirmations to wait for (default: 1, set to 0 to skip waiting) */
  confirmations?: number
}

/**
 * Result of a successful transfer to consensus
 */
export type TransferToConsensusResult = {
  /** Transaction hash */
  transactionHash: string
  /** Block number where transaction was included */
  blockNumber: number
  /** Block hash */
  blockHash: string
  /** Gas used by the transaction */
  gasUsed: bigint
  /** Effective gas price */
  effectiveGasPrice: bigint
  /** Whether the transaction was successful */
  success: boolean
}

/**
 * Ethers-compatible provider interface (subset of ethers Provider)
 * This allows the SDK to work with any ethers-compatible provider
 */
export interface EvmProvider {
  call(transaction: { to: string; data: string }): Promise<string>
}

/**
 * Ethers-compatible signer interface (subset of ethers Signer)
 * This allows the SDK to work with any ethers-compatible signer
 */
export interface EvmSigner {
  getAddress(): Promise<string>
  sendTransaction(transaction: {
    to: string
    data: string
    value?: bigint
    gasLimit?: bigint
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
  }): Promise<{
    hash: string
    wait(confirmations?: number): Promise<{
      blockNumber: number
      blockHash: string
      gasUsed: bigint
      effectiveGasPrice?: bigint | null
      status: number | null
    } | null>
  }>
  provider?: EvmProvider | null
}
