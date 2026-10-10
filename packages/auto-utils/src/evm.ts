// file: src/evm.ts

import { autoEvmChains, autoEvmMainnet } from './constants/evm'
import type { NetworkId } from './constants/network'
import type { EvmChain } from './types/evm'

/**
 * Retrieves the Auto EVM chain configuration for a given network.
 * Defaults to Mainnet if no network is specified.
 *
 * @param networkId - Optional network identifier ('mainnet', 'chronos', 'taurus', 'devnet', 'localhost').
 * @returns The EvmChain configuration compatible with wagmi, RainbowKit, viem, and blocknative.
 *
 * @example
 * ```ts
 * import { getAutoEvmChain } from '@autonomys/auto-utils'
 *
 * const mainnetChain = getAutoEvmChain()
 * const chronosChain = getAutoEvmChain('chronos')
 * ```
 */
export const getAutoEvmChain = (networkId?: NetworkId | string): EvmChain => {
  if (!networkId) return autoEvmMainnet

  const chain = autoEvmChains[networkId as NetworkId]
  if (!chain) {
    throw new Error(`Auto EVM chain for network '${networkId}' not found`)
  }
  return chain
}
