import { query } from '@autonomys/auto-consensus'
import { createDomainsChainIdType, type ApiPromise, type Codec } from '@autonomys/auto-utils'

/**
 * Chain identifier for queries.
 *
 * Use the string literal 'consensus' for the consensus chain,
 * or a number for a specific domain ID.
 *
 * @example
 * ```typescript
 * // Consensus chain
 * const consensus: Chain = 'consensus'
 *
 * // Domain chain (e.g., domain 1)
 * const domain: Chain = 1
 * ```
 */
export type Chain = 'consensus' | { domain: number }

/**
 * Helper to convert Chain type to ChainId Codec
 * @internal
 */
const createChainId = (api: ApiPromise, chain: Chain): Codec => {
  if (chain === 'consensus') {
    return createDomainsChainIdType(api)
  }
  return createDomainsChainIdType(api, chain.domain)
}

/**
 * Query the chain allowlist for the current chain.
 *
 * Returns the allowlist of chains that can open channels with this chain.
 * This is used to control which chains are allowed to establish communication channels.
 *
 * @param api - The API promise instance for the chain
 * @returns The set of allowed chain IDs
 */
export const chainAllowlist = async (api: ApiPromise) =>
  await query<Codec>(api, 'messenger.chainAllowlist', [])

/**
 * Query channels for a specific chain ID.
 *
 * Returns the channel configuration between the current chain and the specified chain.
 * Channels represent bridges for exchanging cross-domain messages between two chains.
 *
 * @param api - The API promise instance for the chain
 * @param chainId - The chain ID to query channels for
 * @returns Channel configuration for the specified chain
 */
export const channels = async (api: ApiPromise, chainId: Codec) =>
  await query<Codec>(api, 'messenger.channels', [chainId])

/**
 * Query channels from the consensus chain.
 *
 * Returns all channels from the consensus chain to other chains (consensus or domains).
 * This is a convenience method that automatically uses the consensus chain ID.
 *
 * @param api - The API promise instance for the consensus chain
 * @returns Channel configurations from the consensus chain
 */
export const consensusChannels = async (api: ApiPromise) =>
  await query<Codec>(api, 'messenger.channels', [createDomainsChainIdType(api)])

/**
 * Query channels from a specific domain.
 *
 * Returns all channels from the specified domain to other chains.
 * This allows domains to communicate with the consensus chain and other domains.
 *
 * @param api - The API promise instance for the domain
 * @param domainId - The domain ID to query channels for
 * @returns Channel configurations from the specified domain
 */
export const domainChannels = async (api: ApiPromise, domainId: number) =>
  await query<Codec>(api, 'messenger.channels', [createDomainsChainIdType(api, domainId)])

/**
 * Query all domain balances on the consensus chain.
 *
 * Returns the balances for all domains tracked on the consensus chain.
 * Domain balances represent the amount of funds available on each domain
 * for processing transfers and other operations.
 *
 * @param api - The API promise instance for the consensus chain
 * @returns All domain balances indexed by domain ID
 */
export const allDomainBalances = async (api: ApiPromise) => {
  return await query<Codec>(api, 'transporter.domainBalances', [])
}

/**
 * Query the balance for a specific domain.
 *
 * Returns the balance for the specified domain on the consensus chain.
 * Domain balances represent the amount of funds available on the domain
 * for processing transfers and other operations.
 *
 * @param api - The API promise instance for the consensus chain
 * @param domainId - The domain ID to query balance for
 * @returns The balance for the specified domain
 */
export const domainBalances = async (api: ApiPromise, domainId: number) => {
  return await query<Codec>(api, 'transporter.domainBalances', [domainId])
}

/**
 * Query cancelled transfers between chains.
 *
 * Returns transfers that have been cancelled/rejected between chains.
 * Cancelled transfers occur when a transfer from one chain to another was rejected
 * by the destination chain. These transfers can be claimed back by the source chain.
 *
 * This storage is only available on the consensus chain where all transfer tracking is maintained.
 * The storage is a DoubleMap keyed by (from_chain_id, to_chain_id), so the first key is required.
 *
 * @param api - The API promise instance for the consensus chain
 * @param from - Source chain: 'consensus' or domain ID (number). Defaults to 'consensus'.
 * @param to - Optional destination chain: 'consensus' or domain ID (number). If omitted, returns all cancelled transfers from the source chain.
 * @returns Cancelled transfers filtered by source chain, or specific entry if both parameters provided.
 *
 * @example
 * ```typescript
 * // All cancelled transfers from consensus
 * const fromConsensus = await cancelledTransfers(api)
 * // or explicitly
 * const fromConsensus = await cancelledTransfers(api, 'consensus')
 *
 * // All cancelled transfers from domain 1
 * const fromDomain = await cancelledTransfers(api, 1)
 *
 * // Specific transfer from consensus to domain 1
 * const specific = await cancelledTransfers(api, 'consensus', 1)
 *
 * // Specific transfer from domain 1 to domain 2
 * const domainToDomain = await cancelledTransfers(api, 1, 2)
 * ```
 */
export const cancelledTransfers = async (
  api: ApiPromise,
  from: Chain = 'consensus',
  to?: Chain,
) => {
  const fromChainId = createChainId(api, from)

  if (to !== undefined) {
    const toChainId = createChainId(api, to)
    return await query<Codec>(api, 'transporter.cancelledTransfers', [fromChainId, toChainId])
  }

  return await query<Codec>(api, 'transporter.cancelledTransfers', [fromChainId])
}

/**
 * Query unconfirmed transfers between chains.
 *
 * Returns transfers that have been initiated but not yet confirmed or rejected.
 * Unconfirmed transfers are in a pending state and will either be confirmed or cancelled.
 *
 * This storage is only available on the consensus chain where all transfer tracking is maintained.
 * The storage is a DoubleMap keyed by (from_chain_id, to_chain_id), so the first key is required.
 *
 * @param api - The API promise instance for the consensus chain
 * @param from - Source chain: 'consensus' or domain ID (number). Defaults to 'consensus'.
 * @param to - Optional destination chain: 'consensus' or domain ID (number). If omitted, returns all unconfirmed transfers from the source chain.
 * @returns Unconfirmed transfers filtered by source chain, or specific entry if both parameters provided.
 *
 * @example
 * ```typescript
 * // All unconfirmed transfers from consensus
 * const fromConsensus = await unconfirmedTransfers(api)
 * // or explicitly
 * const fromConsensus = await unconfirmedTransfers(api, 'consensus')
 *
 * // All unconfirmed transfers from domain 1
 * const fromDomain = await unconfirmedTransfers(api, 1)
 *
 * // Specific transfer from consensus to domain 1
 * const specific = await unconfirmedTransfers(api, 'consensus', 1)
 *
 * // Specific transfer from domain 1 to domain 2
 * const domainToDomain = await unconfirmedTransfers(api, 1, 2)
 * ```
 */
export const unconfirmedTransfers = async (
  api: ApiPromise,
  from: Chain = 'consensus',
  to?: Chain,
) => {
  const fromChainId = createChainId(api, from)

  if (to !== undefined) {
    const toChainId = createChainId(api, to)
    return await query<Codec>(api, 'transporter.unconfirmedTransfers', [fromChainId, toChainId])
  }

  return await query<Codec>(api, 'transporter.unconfirmedTransfers', [fromChainId])
}
