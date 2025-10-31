import { createDomainsChainIdType, type ApiPromise } from '@autonomys/auto-utils'

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
export type Chain = 'consensus' | { domainId: number }

/**
 * Helper to convert Chain type to ChainId Codec
 * @internal
 */
const createChainId = (api: ApiPromise, chain: Chain) => {
  if (chain === 'consensus') {
    return createDomainsChainIdType(api)
  }
  return createDomainsChainIdType(api, chain.domainId)
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
export const chainAllowlist = async (api: ApiPromise) => await api.query.messenger.chainAllowlist()

/**
 * Query the next channel ID for a given chain.
 *
 * Returns the next channel ID that will be assigned when a new channel is created to the specified chain.
 * If the value is 0, no channels exist yet. If > 0, channels exist (IDs start at 1).
 *
 * @param api - The API promise instance for the chain
 * @param chain - The chain to query: 'consensus' or domain ID (number)
 * @returns The next channel ID (U256)
 *
 * @example
 * ```typescript
 * // Check if any channels exist to domain 0
 * const nextId = await nextChannelId(api, { domainId: 0 })
 * const hasChannels = BigInt(nextId.toString()) > 0n
 * ```
 */
export const nextChannelId = async (api: ApiPromise, chain: Chain) => {
  const chainId = createChainId(api, chain)
  return await api.query.messenger.nextChannelId(chainId)
}

/**
 * Query a specific channel between two chains.
 *
 * Channels storage is a DoubleMap keyed by (ChainId, ChannelId).
 * Both the chain and channel ID are required to query a specific channel.
 *
 * Note: To get all channels for a chain, use `api.query.messenger.channels.entries(chainId)` directly.
 *
 * @param api - The API promise instance for the chain
 * @param chain - The chain to query channels for: 'consensus' or domain ID
 * @param channelId - The channel ID (number, string, or bigint)
 * @returns Channel configuration for the specified chain and channel ID
 *
 * @example
 * ```typescript
 * // Query specific channel 1 to domain 0
 * const channel = await channels(api, { domainId: 0 }, 1)
 * ```
 */
export const channels = async (
  api: ApiPromise,
  chain: Chain,
  channelId: number | string | bigint,
) => {
  const chainIdCodec = createChainId(api, chain)
  const channelIdCodec = api.createType('U256', channelId)
  return await api.query.messenger.channels(chainIdCodec, channelIdCodec)
}

/**
 * Query domain balances on the consensus chain.
 *
 * Domain balances represent the amount of funds available on each domain
 * for processing transfers and other operations.
 *
 * @param api - The API promise instance for the consensus chain
 * @param domainId - The domain ID to query balance for. If omitted, returns all domain balances.
 * @returns The balance for the specified domain, or all balances if domainId is omitted
 *
 * @example
 * ```typescript
 * // Query balance for domain 0
 * const balance = await domainBalances(api, 0)
 *
 * // Query all domain balances
 * const allBalances = await domainBalances(api)
 * ```
 */
export const domainBalances = async (api: ApiPromise, domainId?: number) => {
  if (domainId !== undefined) {
    return await api.query.transporter.domainBalances(domainId)
  }

  // Get all entries when no domainId is provided
  return await api.query.transporter.domainBalances.entries()
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
    return await api.query.transporter.cancelledTransfers(fromChainId, toChainId)
  }

  return await api.query.transporter.cancelledTransfers(fromChainId)
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
    return await api.query.transporter.unconfirmedTransfers(fromChainId, toChainId)
  }

  return await api.query.transporter.unconfirmedTransfers(fromChainId)
}
