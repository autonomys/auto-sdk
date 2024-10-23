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

export enum NetworkName {
  TAURUS = 'Testnet - Taurus',
  GEMINI_3H = 'Testnet - Gemini 3H',
  DEVNET = 'Devnet',
  LOCALHOST = 'Localhost',
}

export enum NetworkExplorerName {
  ASTRAL = 'Astral',
  SUBSCAN = 'Subscan',
}

export const ASTRAL_EXPLORER = 'https://explorer.autonomys.xyz/'
export const SUBSCAN_EXPLORER = 'https://subspace.subscan.io/'

export const networks: Network[] = [
  {
    id: NetworkId.TAURUS,
    name: NetworkName.TAURUS,
    rpcUrls: [
      'wss://rpc.taurus.subspace.network/ws',
      'wss://rpc-0.taurus.subspace.network/ws',
      'wss://rpc-1.taurus.subspace.network/ws',
    ],
    explorer: [
      {
        name: NetworkExplorerName.ASTRAL,
        url: ASTRAL_EXPLORER + 'taurus/consensus/',
      },
    ],
    domains: [],
    token: TESTNET_TOKEN,
    isTestnet: true,
  },
  {
    id: NetworkId.GEMINI_3H,
    name: NetworkName.GEMINI_3H,
    rpcUrls: [
      'wss://rpc-0.gemini-3h.subspace.network/ws',
      'wss://rpc-1.gemini-3h.subspace.network/ws',
    ],
    explorer: [
      {
        name: NetworkExplorerName.ASTRAL,
        url: ASTRAL_EXPLORER + 'gemini-3h/consensus/',
      },
      {
        name: NetworkExplorerName.SUBSCAN,
        url: SUBSCAN_EXPLORER,
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
    name: NetworkName.DEVNET,
    rpcUrls: ['ws://rpc.devnet.subspace.network/ws'],
    explorer: [
      {
        name: NetworkExplorerName.ASTRAL,
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
    name: NetworkName.LOCALHOST,
    rpcUrls: ['ws://127.0.0.1:9944/ws'],
    explorer: [
      {
        name: NetworkExplorerName.ASTRAL,
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
