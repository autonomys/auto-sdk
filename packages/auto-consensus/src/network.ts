import { defaultNetwork, networks } from './constants/network'

export const getNetworkDetails = (id?: string) => {
  // If no id is provided, return the default network
  if (!id) return defaultNetwork

  // Find the network with the provided id
  const network = networks.find((network) => network.id === id)
  if (!network) throw new Error(`Network with id ${id} not found`)

  return network
}

export const getNetworkRpcUrls = (id?: string) => {
  // Get the network details
  const network = getNetworkDetails(id)

  if (!network) throw new Error(`Network with id ${id} not found`)
  if (!network.rpcUrls || network.rpcUrls.length === 0)
    throw new Error(`Network with id ${id} has no rpcUrls`)

  return network.rpcUrls
}
