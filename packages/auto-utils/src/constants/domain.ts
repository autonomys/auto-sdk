// file: src/constants/domain.ts

import { Domains } from '../types/domain'

export enum DomainRuntime {
  AUTO_ID = 'auto-id',
  AUTO_EVM = 'auto-evm',
}

export const domains: Domains = {
  [DomainRuntime.AUTO_EVM]: {
    runtime: DomainRuntime.AUTO_EVM,
    name: 'Auto-EVM',
  },
  [DomainRuntime.AUTO_ID]: {
    runtime: DomainRuntime.AUTO_ID,
    name: 'Auto-ID',
  },
}
