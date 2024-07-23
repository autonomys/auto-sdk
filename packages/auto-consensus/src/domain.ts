// file: src/staking.ts

import type { Api } from '@autonomys/auto-utils'
import { ConfirmedDomainBlock, DomainRegistry, DomainStakingSummary } from './types'
import { parseDomain } from './utils/parse'

export const domains = async (api: Api): Promise<DomainRegistry[]> => {
  try {
    const _domains = await api.query.domains.domainRegistry.entries()
    return _domains.map((o) => parseDomain(o))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error querying domains list.' + error)
  }
}

export const domainStakingSummary = async (api: Api): Promise<DomainStakingSummary[]> => {
  try {
    const _domainStakingSummary = await api.query.domains.domainStakingSummary.entries()
    return _domainStakingSummary.map((domain) => domain[1].toJSON() as DomainStakingSummary)
  } catch (error) {
    console.error('error', error)
    throw new Error('Error querying domains staking summary list.' + error)
  }
}

export const latestConfirmedDomainBlock = async (api: Api): Promise<ConfirmedDomainBlock[]> => {
  try {
    const _latestConfirmedDomainBlock = await api.query.domains.latestConfirmedDomainBlock.entries()
    return _latestConfirmedDomainBlock.map((domainBlock) => ({
      id: parseInt((domainBlock[0].toHuman() as string[])[0]),
      ...(domainBlock[1].toJSON() as Omit<ConfirmedDomainBlock, 'id'>),
    }))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error querying latest confirmed block list.' + error)
  }
}
