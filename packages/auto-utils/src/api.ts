import { ApiPromise as PolkadotApiPromise, WsProvider } from '@polkadot/api'
import { getNetworkDomainRpcUrls, getNetworkRpcUrls } from './network'
import type { ApiPromise } from './types/api'
import type { DomainInput, NetworkInput } from './types/network'

let provider: WsProvider | null = null
let apiInstance: ApiPromise | null = null

let domainProvider: WsProvider | null = null
let apiDomainInstance: ApiPromise | null = null

export const activate = async (input?: NetworkInput): Promise<ApiPromise> => {
  // Get the first rpc urls for the network
  const rpcUrl = getNetworkRpcUrls(input)
  // Create the provider
  provider = new WsProvider(rpcUrl[0])
  // Create the API instance
  apiInstance = await PolkadotApiPromise.create({ provider })

  return apiInstance
}

export const activateDomain = async (input: DomainInput): Promise<ApiPromise> => {
  // Get the first rpc urls for the network
  const rpcUrl = getNetworkDomainRpcUrls(input)
  // Create the provider
  domainProvider = new WsProvider(rpcUrl[0])
  // Create the API instance
  apiDomainInstance = await PolkadotApiPromise.create({ provider: domainProvider })

  return apiDomainInstance
}

export const disconnect = async (): Promise<void> => {
  // Disconnect the API instance and the provider if they exist
  if (apiInstance) {
    await apiInstance.disconnect()
    apiInstance = null
    provider = null
  }
}

export const disconnectDomain = async (): Promise<void> => {
  // Disconnect the API instance and the provider if they exist
  if (apiDomainInstance) {
    await apiDomainInstance.disconnect()
    apiDomainInstance = null
    domainProvider = null
  }
}
