import { createDomainsChainIdType, type ApiPromise } from '@autonomys/auto-utils'
import type { Chain, ChainAllowlist, ChainId, Channel, ChannelState } from './types'

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
 * Helper to convert ChainId to Chain
 * @internal
 */
const chainIdToChain = (chainId: ChainId): Chain => {
  if ('consensus' in chainId) {
    return 'consensus'
  }
  return { domainId: chainId.domain }
}

/**
 * Helper to convert Channel Codec to friendly Channel type
 * @internal
 */
const codecToChannel = (codec: unknown): Channel | null => {
  if (!codec || typeof codec !== 'object') return null

  // Check if it's an empty Codec
  if ('isEmpty' in codec && (codec as { isEmpty: boolean }).isEmpty) {
    return null
  }

  // Convert to JSON first to get the structure
  const json =
    'toJSON' in codec && typeof (codec as { toJSON: () => unknown }).toJSON === 'function'
      ? (codec as { toJSON: () => unknown }).toJSON()
      : codec

  if (!json || typeof json !== 'object' || json === null) return null

  const channel = json as Record<string, unknown>

  // Convert field names from Rust snake_case to camelCase
  const state = channel.state as string
  const stateMap: Record<string, ChannelState> = {
    Initiated: 'Initiated',
    Open: 'Open',
    Closed: 'Closed',
  }

  return {
    channelId: String(channel.channel_id ?? '0'),
    state: stateMap[state] ?? 'Initiated',
    nextInboxNonce: String(channel.next_inbox_nonce ?? '0'),
    nextOutboxNonce: String(channel.next_outbox_nonce ?? '0'),
    latestResponseReceivedMessageNonce:
      channel.latest_response_received_message_nonce !== null &&
      channel.latest_response_received_message_nonce !== undefined
        ? String(channel.latest_response_received_message_nonce)
        : null,
    maxOutgoingMessages: Number(channel.max_outgoing_messages ?? 0),
    maybeOwner:
      channel.maybe_owner !== null && channel.maybe_owner !== undefined
        ? String(channel.maybe_owner)
        : null,
    channelReserveFee: String(channel.channel_reserve_fee ?? '0'),
  }
}

/**
 * Query the chain allowlist for the current chain.
 *
 * Returns the allowlist of chains that can open channels with this chain.
 * This is used to control which chains are allowed to establish communication channels.
 *
 * @param api - The API promise instance for the chain
 * @returns An array of Chain identifiers that are allowed to open channels
 *
 * @example
 * ```typescript
 * const allowlist = await chainAllowlist(api)
 * // allowlist: ['consensus'] or [{ domainId: 0 }, { domainId: 1 }]
 *
 * // Check if a specific chain is in the allowlist
 * const isDomain0Allowed = allowlist.some(
 *   chain => chain !== 'consensus' && chain.domainId === 0
 * )
 * ```
 */
export const chainAllowlist = async (api: ApiPromise): Promise<ChainAllowlist> => {
  const codec = await api.query.messenger.chainAllowlist()
  const chainIds = codec.toJSON() as ChainId[]
  return chainIds.map(chainIdToChain)
}

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
export const nextChannelId = async (api: ApiPromise, chain: Chain): Promise<bigint> => {
  const chainId = createChainId(api, chain)
  const nextId = await api.query.messenger.nextChannelId(chainId)
  return BigInt(nextId.toString())
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
 * @returns Channel configuration for the specified chain and channel ID, or null if not found
 *
 * @example
 * ```typescript
 * // Query specific channel 0 to domain 0
 * const channel = await channels(api, { domainId: 0 }, 0)
 * if (channel) {
 *   console.log(`Channel state: ${channel.state}`)
 *   console.log(`Next outbox nonce: ${channel.nextOutboxNonce}`)
 * }
 * ```
 */
export const channels = async (
  api: ApiPromise,
  chain: Chain,
  channelId: number | string | bigint,
): Promise<Channel | null> => {
  const chainIdCodec = createChainId(api, chain)
  const channelIdCodec = api.createType('U256', channelId)
  const codec = await api.query.messenger.channels(chainIdCodec, channelIdCodec)
  return codecToChannel(codec)
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
