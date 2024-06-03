import type { Network } from '../types/types'

export const networks: Network[] = [
  {
    id: 'gemini-3h',
    name: 'Gemini 3H',
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
    isTestnet: true,
  },
]

export const defaultNetwork = networks[0]
