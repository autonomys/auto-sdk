import { ApiPromise, WsProvider } from '@polkadot/api'
import { getNetworkDomainRpcUrls, getNetworkRpcUrls } from './network'
import type { ActivateInput, ApiOptions, DomainInput, NetworkInput } from './types/network'

export const createConnection = async (
  endpoint: string,
  options?: ApiOptions,
): Promise<ApiPromise> => {
  // Create the provider
  const provider = new WsProvider(endpoint)
  // Create the API instance
  const api = await ApiPromise.create({
    ...options,
    noInitWarn: options?.noInitWarn ?? true,
    provider,
  })
  await api.isReady

  return api
}

export const activate = async (input?: ActivateInput<NetworkInput>): Promise<ApiPromise> => {
  // Get the first rpc urls for the network
  const endpoint = getNetworkRpcUrls(input)
  // Remove the networkId from the input
  if (input) delete input.networkId

  return await createConnection(endpoint[0], input)
}

export const activateDomain = async (input: ActivateInput<DomainInput>): Promise<ApiPromise> => {
  // Get the first rpc urls for the network
  const endpoint = getNetworkDomainRpcUrls(input)
  // Remove the domainId from the input
  const { domainId, ...rest } = input

  return await createConnection(endpoint[0], rest)
}

export const disconnect = async (api: ApiPromise): Promise<void> => {
  // Disconnect the API instance and the provider
  await api.disconnect()
}
