export type Explorer = {
  name: string
  url: string
}

export type Network = {
  id: string
  name: string
  rpcUrls: string[]
  explorer: Explorer[]
  isTestnet?: boolean
}
