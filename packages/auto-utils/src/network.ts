import { defaultNetwork, networks } from './constants/network'
import type { DomainInput, NetworkInput } from './types/types'

export const getNetworkDetails = (input?: NetworkInput) => {
  // If no id is provided, return the default network
  if (!input || !input.networkId) return defaultNetwork

  const { networkId } = input

  // Find the network with the provided id
  const network = networks.find((network) => network.id === networkId)
  if (!network) throw new Error(`Network with id ${networkId} not found`)

  return network
}

export const getNetworkRpcUrls = (input?: NetworkInput) => {
  // Get the network details
  const network = getNetworkDetails(input)

  if (!network.rpcUrls || network.rpcUrls.length === 0) throw new Error(`Network has no rpcUrls`)

  return network.rpcUrls
}

export const getNetworkDomainDetails = (input: DomainInput) => {
  const { networkId, domainId } = input

  // Find the network with the provided id
  const network = getNetworkDetails({ networkId })
  if (!network) throw new Error(`Network with id ${networkId} not found`)

  // Find the domain with the provided id
  const domain = network.domains.find((domain) => domain.id === domainId)
  if (!domain) throw new Error(`Domain with id ${domainId} not found`)

  return domain
}

export const getNetworkDomainRpcUrls = (input: DomainInput) => {
  // Get the network details
  const domain = getNetworkDomainDetails(input)
  if (!domain.rpcUrls || domain.rpcUrls.length === 0) throw new Error(`Domain has no rpcUrls`)

  return domain.rpcUrls
}
