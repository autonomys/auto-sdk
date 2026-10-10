// file: src/constants/evm.ts

import type { EvmChain } from '../types/evm'
import type { NetworkId } from './network'

// Testnets (Taurus, Devnet) intentionally share testnet chain ID 490000
/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
export enum AutoEvmChainId {
  MAINNET = 870,
  CHRONOS = 8700,
  TAURUS = 490000,
  DEVNET = 490000,
  LOCAL = 31337,
}
/* eslint-enable @typescript-eslint/no-duplicate-enum-values */

export const autoEvmMainnet: EvmChain = {
  id: AutoEvmChainId.MAINNET,
  name: 'Autonomys Auto EVM',
  network: 'autonomys-mainnet',
  nativeCurrency: {
    name: 'AI3',
    symbol: 'AI3',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://auto-evm.mainnet.autonomys.xyz/ws'],
      webSocket: ['wss://auto-evm.mainnet.autonomys.xyz/ws'],
    },
    public: {
      http: ['https://auto-evm.mainnet.autonomys.xyz/ws'],
      webSocket: ['wss://auto-evm.mainnet.autonomys.xyz/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://explorer.auto-evm.mainnet.autonomys.xyz/',
    },
    subscan: {
      name: 'Subscan',
      url: 'https://autonomys.subscan.io/',
    },
  },
  testnet: false,
}

export const autoEvm: EvmChain = autoEvmMainnet

export const autoEvmChronos: EvmChain = {
  id: AutoEvmChainId.CHRONOS,
  name: 'Autonomys Chronos Auto EVM',
  network: 'autonomys-chronos',
  nativeCurrency: {
    name: 'Chronos AI3',
    symbol: 'tAI3',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://auto-evm.chronos.autonomys.xyz/ws'],
      webSocket: ['wss://auto-evm.chronos.autonomys.xyz/ws'],
    },
    public: {
      http: ['https://auto-evm.chronos.autonomys.xyz/ws'],
      webSocket: ['wss://auto-evm.chronos.autonomys.xyz/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://explorer.auto-evm.chronos.autonomys.xyz/',
    },
    subscan: {
      name: 'Subscan',
      url: 'https://autonomys-chronos.subscan.io/',
    },
  },
  testnet: true,
}

export const autoEvmTaurus: EvmChain = {
  id: AutoEvmChainId.TAURUS,
  name: 'Autonomys Taurus Auto EVM',
  network: 'autonomys-taurus',
  nativeCurrency: {
    name: 'Taurus AI3',
    symbol: 'tAI3',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://auto-evm.taurus.autonomys.xyz/ws'],
      webSocket: ['wss://auto-evm.taurus.autonomys.xyz/ws'],
    },
    public: {
      http: ['https://auto-evm.taurus.autonomys.xyz/ws'],
      webSocket: ['wss://auto-evm.taurus.autonomys.xyz/ws'],
    },
  },
  testnet: true,
}

export const autoEvmDevnet: EvmChain = {
  id: AutoEvmChainId.DEVNET,
  name: 'Autonomys Devnet Auto EVM',
  network: 'autonomys-devnet',
  nativeCurrency: {
    name: 'Devnet AI3',
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
  id: AutoEvmChainId.LOCAL,
  name: 'Autonomys Local Auto EVM',
  network: 'autonomys-localhost',
  nativeCurrency: {
    name: 'Local AI3',
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
  mainnet: autoEvmMainnet,
  chronos: autoEvmChronos,
  taurus: autoEvmTaurus,
  devnet: autoEvmDevnet,
  localhost: autoEvmLocalhost,
}
