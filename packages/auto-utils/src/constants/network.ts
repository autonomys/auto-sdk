// file: src/constants/network.ts

import type { Network } from '../types/network'
import { DomainRuntime, domains } from './domain'
import { DEFAULT_TOKEN, TESTNET_TOKEN } from './token'

export enum NetworkId {
  MAINNET = 'mainnet',
  CHRONOS = 'chronos',
  TAURUS = 'taurus',
  DEVNET = 'devnet',
  LOCALHOST = 'localhost',
}

export enum NetworkName {
  MAINNET = 'Mainnet',
  CHRONOS = 'Testnet - Chronos',
  TAURUS = 'Testnet - Taurus',
  DEVNET = 'Devnet',
  LOCALHOST = 'Localhost',
}

export enum NetworkExplorerName {
  SUBSCAN = 'Subscan',
}

export const SUBSCAN_EXPLORER = 'https://autonomys.subscan.io/'
export const SUBSCAN_CHRONOS_EXPLORER = 'https://autonomys-chronos.subscan.io/'

export const networks: Network[] = [
  {
    id: NetworkId.MAINNET,
    name: NetworkName.MAINNET,
    rpcUrls: ['wss://rpc.mainnet.autonomys.xyz/ws', 'wss://rpc.mainnet.subspace.foundation/ws'],
    explorer: [
      {
        name: NetworkExplorerName.SUBSCAN,
        url: SUBSCAN_EXPLORER,
      },
    ],
    domains: [
      {
        domainId: '0',
        ...domains[DomainRuntime.AUTO_EVM],
        rpcUrls: ['wss://auto-evm.mainnet.autonomys.xyz/ws'],
      },
    ],
    token: DEFAULT_TOKEN,
  },
  {
    id: NetworkId.CHRONOS,
    name: NetworkName.CHRONOS,
    rpcUrls: ['wss://rpc.chronos.autonomys.xyz/ws'],
    explorer: [
      {
        name: NetworkExplorerName.SUBSCAN,
        url: SUBSCAN_CHRONOS_EXPLORER,
      },
    ],
    domains: [
      {
        domainId: '0',
        ...domains[DomainRuntime.AUTO_EVM],
        rpcUrls: ['wss://auto-evm.chronos.autonomys.xyz/ws'],
      },
    ],
    token: TESTNET_TOKEN,
    isTestnet: true,
  },
  {
    id: NetworkId.TAURUS,
    name: NetworkName.TAURUS,
    rpcUrls: ['wss://rpc-0.taurus.autonomys.xyz/ws'],
    explorer: [],
    domains: [
      {
        domainId: '0',
        ...domains[DomainRuntime.AUTO_EVM],
        rpcUrls: ['wss://auto-evm.taurus.autonomys.xyz/ws'],
      },
    ],
    token: TESTNET_TOKEN,
    isTestnet: true,
    isDeprecated: true,
  },
  {
    id: NetworkId.DEVNET,
    name: NetworkName.DEVNET,
    rpcUrls: ['ws://rpc.devnet.autonomys.xyz/ws'],
    explorer: [],
    domains: [
      {
        domainId: '0',
        ...domains[DomainRuntime.AUTO_EVM],
        rpcUrls: ['wss:///auto-evm.devnet.autonomys.xyz/ws'],
      },
      {
        domainId: '1',
        ...domains[DomainRuntime.AUTO_ID],
        rpcUrls: ['wss://autoid.devnet.autonomys.xyz/ws'],
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
    explorer: [],
    domains: [
      {
        domainId: '0',
        ...domains[DomainRuntime.AUTO_EVM],
        rpcUrls: ['ws://127.0.0.1:9945/ws'],
      },
      {
        domainId: '1',
        ...domains[DomainRuntime.AUTO_ID],
        rpcUrls: ['ws://127.0.0.1:9946/ws'],
      },
    ],
    token: TESTNET_TOKEN,
    isTestnet: true,
    isLocalhost: true,
  },
]

export const defaultNetwork = networks[0]
