// file: src/types/evm.ts

export type EvmNativeCurrency = {
  name: string
  symbol: string
  decimals: number
}

export type EvmRpcUrls = {
  http: readonly string[]
  webSocket?: readonly string[]
}

export type EvmBlockExplorer = {
  name: string
  url: string
  apiUrl?: string
}

export type EvmChain = {
  id: number
  name: string
  network?: string
  nativeCurrency: EvmNativeCurrency
  rpcUrls: {
    default: EvmRpcUrls
    public?: EvmRpcUrls
    [key: string]: EvmRpcUrls | undefined
  }
  blockExplorers?: {
    default: EvmBlockExplorer
    [key: string]: EvmBlockExplorer | undefined
  }
  contracts?: Record<string, { address: `0x${string}` | string }>
  testnet?: boolean
}
