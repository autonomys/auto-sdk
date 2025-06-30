import { ApiPromise, WsProvider } from '@polkadot/api'
import { getNetworkDomainRpcUrls, getNetworkRpcUrls } from './network'
import {
  ActivateParams,
  ApiOptions,
  CHAIN_TYPES,
  DomainParams,
  NetworkParams,
} from './types/network'

/**
 * Creates a connection to a Polkadot.js API instance with WebSocket provider.
 * 
 * This function establishes a WebSocket connection to the Autonomys Network or domain
 * and returns a fully initialized ApiPromise instance. It automatically includes
 * the necessary chain types and waits for the API to be ready before returning.
 * 
 * @param endpoint - The WebSocket endpoint URL(s) to connect to. Can be a single URL or array of URLs.
 * @param options - Optional configuration for the API instance.
 * @returns A Promise that resolves to an initialized ApiPromise instance.
 * 
 * @example
 * import { createConnection } from '@autonomys/auto-utils'
 * 
 * // Connect to single endpoint
 * const api = await createConnection('wss://rpc-0.taurus.autonomys.xyz/ws')
 * console.log('Connected to API')
 * 
 * // Connect with multiple endpoints for failover
 * const endpoints = [
 *   'wss://rpc-0.taurus.autonomys.xyz/ws',
 *   'wss://rpc-1.taurus.autonomys.xyz/ws'
 * ]
 * const apiWithFailover = await createConnection(endpoints)
 * 
 * // Connect with custom options
 * const customApi = await createConnection(
 *   'wss://rpc-0.taurus.autonomys.xyz/ws',
 *   {
 *     noInitWarn: false,
 *     types: { CustomType: 'u32' }
 *   }
 * )
 * 
 * // Always disconnect when done
 * await api.disconnect()
 * 
 * @throws {Error} When connection fails or API initialization fails.
 */
export const createConnection = async (
  endpoint: string | string[],
  options?: ApiOptions,
): Promise<ApiPromise> => {
  // Create the provider
  const provider = new WsProvider(endpoint)
  // Create the API instance
  const api = await ApiPromise.create({
    ...options,
    types: { ...CHAIN_TYPES, ...options?.types },
    noInitWarn: options?.noInitWarn ?? true,
    provider,
  })
  await api.isReady

  return api
}

/**
 * Activates a connection to the Autonomys Network consensus layer.
 * 
 * This function simplifies connecting to the Autonomys Network by automatically
 * resolving the network RPC URLs and establishing a connection. It supports all
 * available networks including mainnet, testnet, and local development networks.
 * 
 * @param params - Optional network activation parameters including networkId and API options.
 * @returns A Promise that resolves to an initialized ApiPromise instance for the consensus layer.
 * 
 * @example
 * import { activate } from '@autonomys/auto-utils'
 * 
 * // Connect to default network (mainnet)
 * const api = await activate()
 * console.log('Connected to mainnet')
 * 
 * // Connect to specific network
 * const taurusApi = await activate({ networkId: 'taurus' })
 * console.log('Connected to Taurus testnet')
 * 
 * // Connect to local development network
 * const localApi = await activate({ networkId: 'localhost' })
 * console.log('Connected to localhost')
 * 
 * // Connect with custom API options
 * const customApi = await activate({
 *   networkId: 'gemini-3h',
 *   noInitWarn: false,
 *   types: { CustomType: 'u64' }
 * })
 * 
 * // Always disconnect when done
 * await api.disconnect()
 * 
 * @throws {Error} When the specified network is not found or connection fails.
 */
export const activate = async (params?: ActivateParams<NetworkParams>): Promise<ApiPromise> => {
  // Get the first rpc urls for the network
  const endpoint = getNetworkRpcUrls(params)
  // Remove the networkId from the input
  if (params) delete params.networkId

  return await createConnection(endpoint, params)
}

/**
 * Activates a connection to a specific domain within the Autonomys Network.
 * 
 * This function connects to domain-specific networks like Auto-EVM or Auto-ID
 * which run as domains on top of the Autonomys consensus layer. Each domain
 * has its own RPC endpoints and may have domain-specific functionality.
 * 
 * @param params - Domain activation parameters including networkId, domainId, and API options.
 * @returns A Promise that resolves to an initialized ApiPromise instance for the specified domain.
 * 
 * @example
 * import { activateDomain } from '@autonomys/auto-utils'
 * 
 * // Connect to Auto-EVM domain on Taurus testnet
 * const evmApi = await activateDomain({
 *   networkId: 'taurus',
 *   domainId: '0'
 * })
 * console.log('Connected to Auto-EVM domain')
 * 
 * // Connect to Auto-ID domain on Gemini-3H
 * const autoIdApi = await activateDomain({
 *   networkId: 'gemini-3h',
 *   domainId: '1'
 * })
 * console.log('Connected to Auto-ID domain')
 * 
 * // Connect to localhost domain for development
 * const localDomainApi = await activateDomain({
 *   networkId: 'localhost',
 *   domainId: '0'
 * })
 * 
 * // Connect with custom API options
 * const customDomainApi = await activateDomain({
 *   networkId: 'taurus',
 *   domainId: '0',
 *   noInitWarn: false
 * })
 * 
 * // Always disconnect when done
 * await evmApi.disconnect()
 * 
 * @throws {Error} When the specified network or domain is not found, or connection fails.
 */
export const activateDomain = async (params: ActivateParams<DomainParams>): Promise<ApiPromise> => {
  // Get the first rpc urls for the network
  const endpoint = getNetworkDomainRpcUrls(params)
  // Remove the domainId from the input
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { domainId, ...rest } = params

  return await createConnection(endpoint, rest)
}

/**
 * Disconnects an active API connection and cleans up resources.
 * 
 * This function properly closes the WebSocket connection and cleans up any
 * resources associated with the API instance. It should always be called
 * when you're done using an API connection to prevent resource leaks.
 * 
 * @param api - The ApiPromise instance to disconnect.
 * @returns A Promise that resolves when the disconnection is complete.
 * 
 * @example
 * import { activate, disconnect } from '@autonomys/auto-utils'
 * 
 * // Connect and then disconnect
 * const api = await activate({ networkId: 'taurus' })
 * 
 * // Use the API for operations...
 * const chainInfo = await api.rpc.system.chain()
 * console.log('Chain:', chainInfo.toString())
 * 
 * // Always disconnect when done
 * await disconnect(api)
 * console.log('API disconnected')
 * 
 * // Or use the API instance method directly
 * // await api.disconnect()
 */
export const disconnect = async (api: ApiPromise): Promise<void> => {
  // Disconnect the API instance and the provider
  await api.disconnect()
}
