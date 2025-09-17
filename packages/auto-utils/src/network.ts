// file: src/network.ts

import { defaultNetwork, networks } from './constants/network'
import type { DomainParams, NetworkParams } from './types/network'

/**
 * Retrieves detailed information about a specific Autonomys network.
 *
 * This function provides access to comprehensive network configuration including
 * RPC endpoints, explorer URLs, domain information, and token details. If no
 * network ID is specified, it returns the default network (mainnet).
 *
 * @param input - Optional network parameters containing the networkId.
 * @returns Complete network configuration object with all network details.
 *
 * @example
 * import { getNetworkDetails } from '@autonomys/auto-utils'
 *
 * // Get default network (mainnet)
 * const mainnet = getNetworkDetails()
 * console.log(mainnet.name) // Output: "Mainnet"
 * console.log(mainnet.token.symbol) // Output: "AI3"
 *
 * // Get specific network details
 * const mainnet = getNetworkDetails({ networkId: 'mainnet' })
 * console.log(mainnet.name) // Output: "Mainnet"
 * console.log(mainnet.isTestnet) // Output: undefined
 * console.log(mainnet.domains.length) // Output: 1 (Auto-EVM domain)
 *
 * // Access network explorers
 * const mainnet = getNetworkDetails({ networkId: 'mainnet' })
 * console.log(mainnet.explorer[0].name) // Output: "Subscan"
 * console.log(mainnet.explorer[0].url) // Output: explorer URL
 *
 * // Check if network is for local development
 * const localhost = getNetworkDetails({ networkId: 'localhost' })
 * console.log(localhost.isLocalhost) // Output: true
 *
 * @throws {Error} When the specified networkId is not found in the available networks.
 */
let hasWarnedDeprecatedOnce = false

export const getNetworkDetails = (input?: NetworkParams) => {
  // If no id is provided, return the default network
  if (!input || !input.networkId) return defaultNetwork

  const { networkId } = input

  // Find the network with the provided id
  const network = networks.find((network) => network.id === networkId)
  if (!network) throw new Error(`Network with id ${networkId} not found`)

  if (network.isDeprecated && !hasWarnedDeprecatedOnce) {
    hasWarnedDeprecatedOnce = true

    console.warn(
      `Warning: Network "${networkId}" is deprecated and will be removed in a future release. ` +
        'Please migrate to Chronos or Mainnet.',
    )
  }

  return network
}

/**
 * Retrieves the RPC endpoint URLs for a specific Autonomys network.
 *
 * This function returns an array of WebSocket RPC URLs that can be used to
 * connect to the specified network's consensus layer. Multiple URLs provide
 * redundancy and load balancing capabilities.
 *
 * @param input - Optional network parameters containing the networkId.
 * @returns Array of WebSocket RPC URLs for the specified network.
 *
 * @example
 * import { getNetworkRpcUrls } from '@autonomys/auto-utils'
 *
 * // Get mainnet RPC URLs
 * const mainnetUrls = getNetworkRpcUrls()
 * console.log(mainnetUrls)
 * // Output: ['wss://rpc-0.mainnet.subspace.network/ws', 'wss://rpc-1.mainnet.subspace.network/ws', ...]
 *
 * // Get testnet RPC URLs
 * const taurusUrls = getNetworkRpcUrls({ networkId: 'taurus' })
 * console.log(taurusUrls)
 * // Output: ['wss://rpc-0.taurus.autonomys.xyz/ws', 'wss://rpc-1.taurus.autonomys.xyz/ws', ...]
 *
 * // Use with API connection
 * import { createConnection } from '@autonomys/auto-utils'
 * const endpoints = getNetworkRpcUrls({ networkId: 'mainnet' })
 * const api = await createConnection(endpoints)
 *
 * // Get localhost URLs for development
 * const localUrls = getNetworkRpcUrls({ networkId: 'localhost' })
 * console.log(localUrls) // Output: ['ws://127.0.0.1:9944/ws']
 *
 * @throws {Error} When the specified network is not found.
 * @throws {Error} When the network has no configured RPC URLs.
 */
export const getNetworkRpcUrls = (input?: NetworkParams) => {
  // Get the network details
  const network = getNetworkDetails(input)

  if (!network.rpcUrls || network.rpcUrls.length === 0) throw new Error('Network has no rpcUrls')

  return network.rpcUrls
}

/**
 * Retrieves detailed information about a specific domain within an Autonomys network.
 *
 * This function provides access to domain-specific configuration including
 * the domain's runtime type, name, and RPC endpoints. Domains are specialized
 * execution environments that run on top of the Autonomys consensus layer.
 *
 * @param params - Domain parameters containing both networkId and domainId.
 * @returns Complete domain configuration object with runtime and connection details.
 *
 * @example
 * import { getNetworkDomainDetails } from '@autonomys/auto-utils'
 *
 * // Get Auto-EVM domain details on Taurus
 * const evmDomain = getNetworkDomainDetails({
 *   networkId: 'taurus',
 *   domainId: '0'
 * })
 * console.log(evmDomain.name) // Output: "Auto-EVM"
 * console.log(evmDomain.runtime) // Output: "auto-evm"
 * console.log(evmDomain.rpcUrls.length) // Output: number of available RPC endpoints
 *
 * // Get Auto-EVM domain details on Mainnet
 * const autoEvmDomain = getNetworkDomainDetails({
 *   networkId: 'mainnet',
 *   domainId: '0'
 * })
 * console.log(autoEvmDomain.name) // Output: "Auto-EVM"
 * console.log(autoEvmDomain.runtime) // Output: "auto-evm"
 *
 * // Use with domain connection
 * import { activateDomain } from '@autonomys/auto-utils'
 * const domainApi = await activateDomain({
 *   networkId: 'taurus',
 *   domainId: '0'
 * })
 *
 * @throws {Error} When the specified networkId is not found.
 * @throws {Error} When the specified domainId is not found within the network.
 */
export const getNetworkDomainDetails = (params: DomainParams) => {
  const { networkId, domainId } = params

  // Find the network with the provided id
  const network = getNetworkDetails({ networkId })
  if (!network) throw new Error(`Network with id ${networkId} not found`)

  // Find the domain with the provided id
  const domain = network.domains.find((domain) => domain.domainId === domainId)
  if (!domain) throw new Error(`Domain with id ${domainId} not found`)

  return domain
}

/**
 * Retrieves the RPC endpoint URLs for a specific domain within an Autonomys network.
 *
 * This function returns an array of WebSocket RPC URLs that can be used to
 * connect to the specified domain. Domain RPC endpoints provide access to
 * domain-specific functionality and state.
 *
 * @param params - Domain parameters containing both networkId and domainId.
 * @returns Array of WebSocket RPC URLs for the specified domain.
 *
 * @example
 * import { getNetworkDomainRpcUrls } from '@autonomys/auto-utils'
 *
 * // Get Auto-EVM domain RPC URLs on Taurus
 * const evmUrls = getNetworkDomainRpcUrls({
 *   networkId: 'taurus',
 *   domainId: '0'
 * })
 * console.log(evmUrls)
 * // Output: ['wss://auto-evm.taurus.autonomys.xyz/ws', 'wss://auto-evm-0.taurus.autonomys.xyz/ws', ...]
 *
 * // Get Auto-EVM domain RPC URLs on Mainnet
 * const autoEvmUrls = getNetworkDomainRpcUrls({
 *   networkId: 'mainnet',
 *   domainId: '0'
 * })
 * console.log(autoEvmUrls)
 * // Output: ['wss://auto-evm.taurus.autonomys.xyz/ws']
 *
 * // Use with API connection
 * import { createConnection } from '@autonomys/auto-utils'
 * const domainEndpoints = getNetworkDomainRpcUrls({
 *   networkId: 'localhost',
 *   domainId: '0'
 * })
 * const domainApi = await createConnection(domainEndpoints)
 *
 * @throws {Error} When the specified network or domain is not found.
 * @throws {Error} When the domain has no configured RPC URLs.
 */
export const getNetworkDomainRpcUrls = (params: DomainParams) => {
  // Get the network details
  const domain = getNetworkDomainDetails(params)
  if (!domain.rpcUrls || domain.rpcUrls.length === 0) throw new Error('Domain has no rpcUrls')

  return domain.rpcUrls
}
