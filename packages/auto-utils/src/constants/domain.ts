// file: src/constants/domain.ts

import { Domains } from '../types/domain'

export enum DomainRuntime {
  AUTO_ID = 'auto-id',
  NOVA = 'nova',
}

export const domains: Domains = {
  [DomainRuntime.AUTO_ID]: {
    runtime: DomainRuntime.NOVA,
    name: 'Nova (EVM)',
  },
  [DomainRuntime.NOVA]: {
    runtime: DomainRuntime.AUTO_ID,
    name: 'Auto-ID',
  },
}
