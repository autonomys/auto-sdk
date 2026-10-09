// file: src/constants/evm.ts

import type { EvmChain } from '../types/evm'
import { NetworkId } from './network'

export const AUTO_EVM_CHAIN_IDS = {
  [NetworkId.MAINNET]: 870,
  [NetworkId.CHRONOS]: 8700,
  [NetworkId.TAURUS]: 490000,
  [NetworkId.DEVNET]: 1000,
  [NetworkId.LOCALHOST]: 8700,
} as const

export const autoEvmMainnet: EvmChain = {
  id: AUTO_EVM_CHAIN_IDS[NetworkId.MAINNET],
  name: 'Auto EVM Mainnet',
  nativeCurrency: {
    name: 'Auto Token',
    symbol: 'AI3',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://auto-evm.mainnet.autonomys.xyz/ws'],
      webSocket: ['wss://auto-evm.mainnet.autonomys.xyz/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://explorer.auto-evm.mainnet.autonomys.xyz',
    },
  },
}

export const autoEvmChronos: EvmChain = {
  id: AUTO_EVM_CHAIN_IDS[NetworkId.CHRONOS],
  name: 'Auto EVM Chronos Testnet',
  nativeCurrency: {
    name: 'Chronos Auto Token',
    symbol: 'tAI3',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://auto-evm.chronos.autonomys.xyz/ws'],
      webSocket: ['wss://auto-evm.chronos.autonomys.xyz/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://blockscout.chronos.autonomys.xyz',
    },
  },
  testnet: true,
}

export const autoEvmTaurus: EvmChain = {
  id: AUTO_EVM_CHAIN_IDS[NetworkId.TAURUS],
  name: 'Auto EVM Taurus Testnet',
  nativeCurrency: {
    name: 'Taurus Auto Token',
    symbol: 'tAI3',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://auto-evm.taurus.autonomys.xyz/ws'],
      webSocket: ['wss://auto-evm.taurus.autonomys.xyz/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://blockscout.taurus.autonomys.xyz',
    },
  },
  testnet: true,
}

export const autoEvmDevnet: EvmChain = {
  id: AUTO_EVM_CHAIN_IDS[NetworkId.DEVNET],
  name: 'Auto EVM Devnet',
  nativeCurrency: {
    name: 'Devnet Auto Token',
    symbol: 'tAI3',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://auto-evm.devnet.autonomys.xyz/ws'],
      webSocket: ['wss://auto-evm.devnet.autonomys.xyz/ws'],
    },
  },
  testnet: true,
}

export const autoEvmLocalhost: EvmChain = {
  id: AUTO_EVM_CHAIN_IDS[NetworkId.LOCALHOST],
  name: 'Auto EVM Localhost',
  nativeCurrency: {
    name: 'Local Auto Token',
    symbol: 'tAI3',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:9945'],
      webSocket: ['ws://127.0.0.1:9945'],
    },
  },
  testnet: true,
}

export const autoEvmChains: Record<NetworkId, EvmChain> = {
  [NetworkId.MAINNET]: autoEvmMainnet,
  [NetworkId.CHRONOS]: autoEvmChronos,
  [NetworkId.TAURUS]: autoEvmTaurus,
  [NetworkId.DEVNET]: autoEvmDevnet,
  [NetworkId.LOCALHOST]: autoEvmLocalhost,
}
