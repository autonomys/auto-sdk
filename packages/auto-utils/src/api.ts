import { ApiPromise, WsProvider } from '@polkadot/api'
import { getNetworkDomainRpcUrls, getNetworkRpcUrls } from './network'
import type { DomainInput, NetworkInput } from './types/network'

export const activate = async (input?: NetworkInput): Promise<ApiPromise> => {
  // Get the first rpc urls for the network
  const rpcUrl = getNetworkRpcUrls(input)
  // Create the provider
  const provider = new WsProvider(rpcUrl[0])
  // Create the API instance
  const api = await ApiPromise.create({ provider })
  await api.isReady

  return api
}

export const activateDomain = async (input: DomainInput): Promise<ApiPromise> => {
  // Get the first rpc urls for the network
  const rpcUrl = getNetworkDomainRpcUrls(input)
  // Create the provider
  const provider = new WsProvider(rpcUrl[0])
  // Create the API instance
  const api = await ApiPromise.create({ provider })
  await api.isReady

  return api
}

export const disconnect = async (api: ApiPromise): Promise<void> => {
  // Disconnect the API instance and the provider
  await api.disconnect()
}
