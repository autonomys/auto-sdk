import { ApiPromise, WsProvider } from '@polkadot/api'
import { getNetworkRpcUrls } from './network'

let provider: WsProvider | null = null
let apiInstance: ApiPromise | null = null

export const activate = async (networkId?: string) => {
  // Get the first rpc urls for the network
  const rpcUrl = getNetworkRpcUrls(networkId)
  // Create the provider
  provider = new WsProvider(rpcUrl)
  // Create the API instance
  apiInstance = await ApiPromise.create({ provider })

  return apiInstance
}

export const disconnect = async () => {
  // Disconnect the API instance and the provider if they exist
  if (apiInstance) {
    await apiInstance.disconnect()
    apiInstance = null
    provider = null
  }
}
