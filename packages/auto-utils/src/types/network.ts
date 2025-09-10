// file: src/types/network.ts
import type { ApiOptions } from '@polkadot/api/types'
import { NetworkId, NetworkName } from '../constants/network'
import type { NetworkDomains } from './domain'
import { Token } from './token'

export type Explorer = {
  name: string
  url: string
}

export type Network = {
  id: NetworkId
  name: NetworkName
  rpcUrls: string[]
  explorer: Explorer[]
  domains: NetworkDomains[]
  token: Token
  isTestnet?: boolean
  isLocalhost?: boolean
  isDeprecated?: boolean
}

export type NetworkParams = { networkId?: string } | undefined

export type DomainParams = {
  networkId?: string
  domainId: string
}

export type ActivateParams<T> = T & ApiOptions

export const CHAIN_TYPES = {
  Solution: {
    public_key: 'AccountId32',
    reward_address: 'AccountId32',
  },
  SubPreDigest: {
    slot: 'u64',
    solution: 'Solution',
  },
}

export type { ApiOptions }
