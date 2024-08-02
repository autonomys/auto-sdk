// file: src/constants/domain.ts

export enum DomainId {
  AUTO_ID = 'auto-id',
  NOVA = 'nova',
}

export const domains = {
  nova: {
    id: DomainId.NOVA,
    name: 'Nova (EVM)',
    domainId: 0,
  },
  autoId: {
    id: DomainId.AUTO_ID,
    name: 'Auto-ID',
    domainId: 1,
  },
}
