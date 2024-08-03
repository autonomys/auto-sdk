// file: src/types/network.ts

import { DomainRuntime } from '../constants'

export type Domain = {
  runtime: DomainRuntime
  name: string
}

export type Domains = {
  [key in DomainRuntime]: Domain
}

export interface NetworkDomains extends Domain {
  domainId: string
  rpcUrls: string[]
}
