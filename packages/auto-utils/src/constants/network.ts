// file: src/constants/network.ts

import type { Network } from '../types/network'

export enum NetworkId {
  AUTONOMYS_GEMINI_3H = 'autonomys-gemini-3h',
  AUTONOMYS_LOCALHOST = 'autonomys-localhost',
}

export enum DomainId {
  AUTO_ID = 'auto-id',
  NOVA = 'nova',
}

export const ASTRAL_EXPLORER = 'https://explorer.subspace.network/'

export const networks: Network[] = [
  {
    id: NetworkId.AUTONOMYS_GEMINI_3H,
    name: 'Autonomys Testnet - Gemini 3H',
    rpcUrls: [
      'wss://rpc-0.gemini-3h.subspace.network/ws',
      'wss://rpc-1.gemini-3h.subspace.network/ws',
    ],
    explorer: [
      {
        name: 'Astral',
        url: ASTRAL_EXPLORER + 'gemini-3h/consensus/',
      },
      {
        name: 'Subscan',
        url: 'https://subspace.subscan.io/',
      },
    ],
    domains: [
      {
        id: DomainId.AUTO_ID,
        name: 'Autonomys - Auto-ID',
        rpcUrls: ['wss://autoid-0.gemini-3h.subspace.network/ws'],
      },
      {
        id: DomainId.NOVA,
        name: 'Autonomys - Nova (EVM)',
        rpcUrls: ['https://nova-0.gemini-3h.subspace.network/ws'],
      },
    ],
    isTestnet: true,
  },
  {
    id: NetworkId.AUTONOMYS_LOCALHOST,
    name: 'Autonomys - Localhost',
    rpcUrls: ['ws://127.0.0.1:9944/ws'],
    explorer: [
      {
        name: 'Astral',
        url: ASTRAL_EXPLORER + 'localhost/consensus/',
      },
    ],
    domains: [
      {
        id: DomainId.AUTO_ID,
        name: 'Autonomys - Auto-ID',
        rpcUrls: ['ws://127.0.0.1:9945/ws'],
      },
      {
        id: DomainId.NOVA,
        name: 'Autonomys - Nova (EVM)',
        rpcUrls: ['https:///127.0.0.1:9946/ws'],
      },
    ],
    isTestnet: true,
    isLocalhost: true,
  },
]

export const defaultNetwork = networks[0]
