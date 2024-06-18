export type Explorer = {
  name: string
  url: string
}

export type Domain = {
  id: string
  name: string
  rpcUrls: string[]
}

export type Network = {
  id: string
  name: string
  rpcUrls: string[]
  explorer: Explorer[]
  domains: Domain[]
  isTestnet?: boolean
  isLocalhost?: boolean
}

export type NetworkInput = { networkId?: string } | undefined

export type DomainInput = {
  networkId?: string
  domainId: string
}
