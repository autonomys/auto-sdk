import type { Network } from '../types/types'

export const networks: Network[] = [
  {
    id: 'autonomys-gemini-3h',
    name: 'Autonomys Testnet - Gemini 3H',
    rpcUrls: [
      'wss://rpc-0.gemini-3h.subspace.network/ws',
      'wss://rpc-1.gemini-3h.subspace.network/ws',
    ],
    explorer: [
      {
        name: 'Astral',
        url: 'https://explorer.subspace.network/gemini-3h/consensus/',
      },
      {
        name: 'Subscan',
        url: 'https://subspace.subscan.io/',
      },
    ],
    domains: [
      {
        id: 'auto-id', // Placeholder
        name: 'Autonomys - Auto-ID',
        rpcUrls: ['wss://rpc.auto-id.subspace.network/ws'],
      },
      {
        id: 'auto-evm', // Placeholder
        name: 'Autonomys - Auto-EVM (Nova)',
        rpcUrls: ['https://nova-0.gemini-3h.subspace.network/ws'],
      },
    ],
    isTestnet: true,
  },
  {
    id: 'autonomys-localhost',
    name: 'Autonomys - Localhost',
    rpcUrls: ['ws://127.0.0.1:9944/ws'],
    explorer: [
      {
        name: 'Astral',
        url: 'https://explorer.subspace.network/localhost/consensus/',
      },
    ],
    domains: [
      {
        id: 'auto-id', // Placeholder
        name: 'Autonomys - Auto-ID',
        rpcUrls: ['ws://127.0.0.1:9945/ws'],
      },
      {
        id: 'auto-evm', // Placeholder
        name: 'Autonomys - Auto-EVM (Nova)',
        rpcUrls: ['https:///127.0.0.1:9946/ws'],
      },
    ],
    isTestnet: true,
    isLocalhost: true,
  },
]

export const defaultNetwork = networks[0]
