// file: src/types/evm.ts

export type EvmNativeCurrency = {
  name: string
  symbol: string
  decimals: number
}

export type EvmBlockExplorer = {
  name: string
  url: string
}

export type EvmChain = {
  id: number
  name: string
  nativeCurrency: EvmNativeCurrency
  rpcUrls: {
    default: {
      http: string[]
      webSocket?: string[]
    }
  }
  blockExplorers?: {
    default: EvmBlockExplorer
    [key: string]: EvmBlockExplorer
  }
  testnet?: boolean
}
