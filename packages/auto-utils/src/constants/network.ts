// file: src/constants/network.ts

import type { Network } from '../types/network'
import { DomainRuntime, domains } from './domain'
import { TESTNET_TOKEN } from './token'

export enum NetworkId {
  TAURUS = 'taurus',
  GEMINI_3H = 'gemini-3h',
  DEVNET = 'devnet',
  LOCALHOST = 'localhost',
}

export const ASTRAL_EXPLORER = 'https://explorer.autonomys.xyz/'

export const networks: Network[] = [
  {
    id: NetworkId.TAURUS,
    name: 'Testnet - Taurus',
    rpcUrls: [
      'wss://rpc.taurus.subspace.network/ws',
      'wss://rpc-0.taurus.subspace.network/ws',
      'wss://rpc-1.taurus.subspace.network/ws',
    ],
    explorer: [
      {
        name: 'Astral',
        url: ASTRAL_EXPLORER + 'taurus/consensus/',
      },
      {
        name: 'Subscan',
        url: 'https://subspace.subscan.io/',
      },
    ],
    domains: [],
    token: TESTNET_TOKEN,
    isTestnet: true,
  },
  {
    id: NetworkId.GEMINI_3H,
    name: 'Testnet - Gemini 3H',
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
        domainId: '0',
        ...domains[DomainRuntime.NOVA],
        rpcUrls: ['wss://nova-0.gemini-3h.subspace.network/ws'],
      },
      {
        domainId: '1',
        ...domains[DomainRuntime.AUTO_ID],
        rpcUrls: ['wss://autoid-0.gemini-3h.subspace.network/ws'],
      },
    ],
    token: TESTNET_TOKEN,
    isTestnet: true,
  },
  {
    id: NetworkId.DEVNET,
    name: 'Devnet',
    rpcUrls: ['ws://rpc.devnet.subspace.network/ws'],
    explorer: [
      {
        name: 'Astral',
        url: ASTRAL_EXPLORER + '/devnet/consensus/',
      },
    ],
    domains: [
      {
        domainId: '0',
        ...domains[DomainRuntime.NOVA],
        rpcUrls: ['wss:///nova.devnet.subspace.network/ws'],
      },
      {
        domainId: '1',
        ...domains[DomainRuntime.AUTO_ID],
        rpcUrls: ['wss://autoid.devnet.subspace.network/ws'],
      },
    ],
    token: TESTNET_TOKEN,
    isTestnet: true,
    isLocalhost: false,
  },
  {
    id: NetworkId.LOCALHOST,
    name: 'Localhost',
    rpcUrls: ['ws://127.0.0.1:9944/ws'],
    explorer: [
      {
        name: 'Astral',
        url: ASTRAL_EXPLORER + 'localhost/consensus/',
      },
    ],
    domains: [
      {
        domainId: '0',
        ...domains[DomainRuntime.NOVA],
        rpcUrls: ['ws:///127.0.0.1:9946/ws'],
      },
      {
        domainId: '1',
        ...domains[DomainRuntime.AUTO_ID],
        rpcUrls: ['ws://127.0.0.1:9945/ws'],
      },
    ],
    token: TESTNET_TOKEN,
    isTestnet: true,
    isLocalhost: true,
  },
]

export const defaultNetwork = networks[0]
