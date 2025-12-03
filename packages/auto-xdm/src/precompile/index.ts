/**
 * Transporter Precompile Module
 *
 * Provides helpers for interacting with the Transporter Precompile on Auto-EVM domains.
 * The precompile enables EVM users to transfer funds to the consensus chain.
 *
 * **Network Compatibility:**
 * - ✅ Chronos testnet
 * - ✅ Local dev nodes (mainnet-2025-dec-02 or later)
 * - ⏳ Mainnet (coming soon)
 *
 * Use {@link isPrecompileDeployed} to check availability at runtime.
 *
 * @example
 * ```typescript
 * import {
 *   transferToConsensus,
 *   isPrecompileDeployed,
 *   TRANSPORTER_PRECOMPILE_ADDRESS,
 * } from '@autonomys/auto-xdm'
 * ```
 *
 * @see https://github.com/autonomys/subspace/pull/3714
 */

// Constants
export { TRANSPORTER_PRECOMPILE_ADDRESS } from './constants'

// ABI
export { TRANSPORTER_PRECOMPILE_ABI } from './abi'

// Types
export type {
  EvmProvider,
  EvmSigner,
  TransferToConsensusOptions,
  TransferToConsensusResult,
} from './types'

// Functions
export {
  createTransferToConsensusTxData,
  encodeAccountId32ToBytes32,
  getMinimumTransferAmount,
  getTransporterPrecompileAbi,
  isPrecompileDeployed,
  transferToConsensus,
} from './transporter'

