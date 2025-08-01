// file: src/staking.ts

import type { Api } from '@autonomys/auto-utils'
import { ConfirmedDomainBlock, DomainRegistry, DomainStakingSummary } from './types'
import { parseDomain } from './utils/parse'

/**
 * Retrieves all registered domains on the network.
 *
 * This function queries the domain registry to get information about all domains
 * registered on the Autonomys network, including their configuration, ownership,
 * and creation details.
 *
 * @param api - The connected API instance to query the blockchain
 * @returns Promise that resolves to an array of DomainRegistry objects
 * @throws Error if the domain registry query fails
 *
 * @example
 * ```typescript
 * import { domains } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'gemini-3h' })
 * const domainList = await domains(api)
 *
 * domainList.forEach(domain => {
 *   console.log(`Domain ID: ${domain.domainId}`)
 *   console.log(`Owner: ${domain.ownerAccountId}`)
 *   console.log(`Name: ${domain.domainConfig.domainName}`)
 * })
 *
 * await api.disconnect()
 * ```
 */
export const domains = async (api: Api): Promise<DomainRegistry[]> => {
  try {
    const _domains = await api.query.domains.domainRegistry.entries()
    return _domains.map((o) => parseDomain(o))
  } catch (error) {
    console.error('error', error)
    throw new Error('Error querying domains list.' + error)
  }
}

// Function overloads for domainStakingSummary
export async function domainStakingSummary(api: Api): Promise<DomainStakingSummary[]>
export async function domainStakingSummary(
  api: Api,
  domainId: string | number | bigint,
): Promise<DomainStakingSummary | undefined>

/**
 * Retrieves staking summary information for domains.
 *
 * This function can be used in two ways:
 * 1. Without domainId: Returns staking summaries for all domains
 * 2. With domainId: Returns staking summary for a specific domain
 *
 * The staking summary includes information about current epoch, total stake,
 * operators, and epoch rewards for each domain.
 *
 * @param api - The connected API instance to query the blockchain
 * @param domainId - Optional domain ID to query specific domain summary
 * @returns Promise that resolves to array of summaries (all domains) or single summary (specific domain)
 * @throws Error if the staking summary query fails
 *
 * @example
 * ```typescript
 * import { domainStakingSummary } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'gemini-3h' })
 *
 * // Get all domain staking summaries
 * const allSummaries = await domainStakingSummary(api)
 * console.log(`Found ${allSummaries.length} domains`)
 *
 * // Get specific domain summary
 * const specificSummary = await domainStakingSummary(api, '0')
 * if (specificSummary) {
 *   console.log(`Domain 0 total stake: ${specificSummary.currentTotalStake}`)
 * }
 *
 * await api.disconnect()
 * ```
 */
// Implementation function
export async function domainStakingSummary(
  api: Api,
  domainId?: string | number | bigint,
): Promise<DomainStakingSummary[] | DomainStakingSummary | undefined> {
  try {
    if (domainId !== undefined) {
      // Query specific domain
      const _domainStakingSummary = await api.query.domains.domainStakingSummary(
        domainId.toString(),
      )
      if (_domainStakingSummary.isEmpty) {
        return undefined
      }
      return {
        domainId: domainId.toString(),
        ...(_domainStakingSummary.toJSON() as Omit<DomainStakingSummary, 'domainId'>),
      } as DomainStakingSummary
    } else {
      const _domainStakingSummary = await api.query.domains.domainStakingSummary.entries()
      return _domainStakingSummary.map(
        (domain) =>
          ({
            domainId: (domain[0].toHuman() as string[])[0],
            ...(domain[1].toJSON() as Omit<DomainStakingSummary, 'domainId'>),
          }) as DomainStakingSummary,
      )
    }
  } catch (error) {
    console.error('error', error)
    throw new Error('Error querying domains staking summary list.' + error)
  }
}

/**
 * Retrieves the latest confirmed domain blocks for all domains.
 *
 * This function queries the latest confirmed block information for each domain,
 * providing details about the most recent blocks that have been confirmed
 * on each domain chain.
 *
 * @param api - The connected API instance to query the blockchain
 * @returns Promise that resolves to an array of ConfirmedDomainBlock objects
 * @throws Error if the confirmed domain block query fails
 *
 * @example
 * ```typescript
 * import { latestConfirmedDomainBlock } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'gemini-3h' })
 * const confirmedBlocks = await latestConfirmedDomainBlock(api)
 *
 * confirmedBlocks.forEach(block => {
 *   console.log(`Domain ${block.id}: Block #${block.blockNumber}`)
 *   console.log(`Block Hash: ${block.blockHash}`)
 *   console.log(`State Root: ${block.stateRoot}`)
 * })
 *
 * await api.disconnect()
 * ```
 */
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

/**
 * Retrieves the latest block number for a specific domain.
 *
 * This function queries the domain's current latest block number, which represents
 * the highest block number that has been processed for the specified domain.
 *
 * @param api - The connected API instance to query the blockchain
 * @param domainId - The ID of the domain to query (can be string, number, or bigint)
 * @returns Promise that resolves to the best block number, or undefined if not found
 * @throws Error if the domain best number query fails
 *
 * @example
 * ```typescript
 * import { headDomainNumber } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'gemini-3h' })
 * const headNumber = await headDomainNumber(api, '0')
 *
 * if (headNumber !== undefined) {
 *   console.log(`Domain 0 head block number: ${headNumber}`)
 * } else {
 *   console.log('Domain not found or no blocks processed')
 * }
 *
 * await api.disconnect()
 * ```
 */
export const headDomainNumber = async (
  api: Api,
  domainId: string | number | bigint,
): Promise<number | undefined> => {
  try {
    const blockHeight = await api.query.domains.headDomainNumber(domainId.toString())
    if (blockHeight.isEmpty) {
      return undefined
    }
    const result = blockHeight.toJSON()
    return result !== null ? Number(result) : undefined
  } catch (error) {
    console.error('error', error)
    throw new Error('Error querying domain head number.' + error)
  }
}
