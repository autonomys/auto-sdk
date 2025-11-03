import { type ApiPromise } from '@autonomys/auto-utils'
import { chainIdToChain, chainToChainIdCodec, codecToBalance, codecToChannel } from './transforms'
import type { Chain, ChainAllowlist, ChainId, Channel, DomainBalance, Transfer } from './types'

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
  const chainId = chainToChainIdCodec(api, chain)
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
  const chainIdCodec = chainToChainIdCodec(api, chain)
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
 * @param domainId - Optional domain ID to query balance for. If provided, returns a single balance bigint. If omitted, returns all domain balances.
 * @returns The balance for the specified domain as a bigint, or an array of all domain balances
 *
 * @example
 * ```typescript
 * // Query balance for a specific domain
 * const balance = await domainBalances(api, 0)
 * // balance: 1000000000000n
 *
 * // Query all domain balances
 * const allBalances = await domainBalances(api)
 * // allBalances: [{ domainId: 0, balance: 1000000000000n }, { domainId: 1, balance: 2000000000000n }]
 * ```
 */
export const domainBalances = async (
  api: ApiPromise,
  domainId?: number,
): Promise<bigint | DomainBalance[]> => {
  if (domainId !== undefined) {
    const codec = await api.query.transporter.domainBalances(domainId)
    return codecToBalance(codec)
  }

  // Get all entries when no domainId is provided
  const entries = await api.query.transporter.domainBalances.entries()
  return entries.map(([key, value]) => {
    // Extract domainId from storage key
    const domainIdCodec = key.args[0]
    const domainId = Number(domainIdCodec.toString())
    return {
      domainId,
      balance: codecToBalance(value),
    }
  })
}

/**
 * Query cancelled transfers between chains.
 *
 * Returns transfers that have been cancelled/rejected between chains.
 * Cancelled transfers occur when a transfer from one chain to another was rejected
 * by the destination chain. These transfers can be claimed back by the source chain.
 *
 * This storage is only available on the consensus chain where all transfer tracking is maintained.
 *
 * @param api - The API promise instance for the consensus chain
 * @param from - Source chain: 'consensus' or { domainId: number }. Defaults to 'consensus'.
 * @param to - Optional destination chain. If provided, returns a specific transfer amount. If omitted, returns all cancelled transfers from the source chain.
 * @returns Transfer amount as bigint for a specific route, or array of all cancelled transfers from the source chain
 *
 * @example
 * ```typescript
 * // All cancelled transfers from consensus
 * const fromConsensus = await cancelledTransfers(api)
 * // fromConsensus: [{ from: 'consensus', to: { domainId: 0 }, amount: 1000000000000n }]
 *
 * // All cancelled transfers from domain 1
 * const fromDomain = await cancelledTransfers(api, { domainId: 1 })
 *
 * // Specific transfer from consensus to domain 1
 * const specific = await cancelledTransfers(api, 'consensus', { domainId: 1 })
 * // specific: 1000000000000n
 * ```
 */
export const cancelledTransfers = async (
  api: ApiPromise,
  from: Chain = 'consensus',
  to?: Chain,
): Promise<bigint | Transfer[]> => {
  const fromChainId = chainToChainIdCodec(api, from)

  if (to !== undefined) {
    const toChainId = chainToChainIdCodec(api, to)
    const codec = await api.query.transporter.cancelledTransfers(fromChainId, toChainId)
    return codecToBalance(codec)
  }

  const entries = await api.query.transporter.cancelledTransfers.entries(fromChainId)
  return entries.map(([key, value]) => {
    // Extract toChainId from storage key (second key in DoubleMap)
    const toChainIdCodec = key.args[1]
    const toChainId = toChainIdCodec.toJSON() as ChainId
    return {
      from,
      to: chainIdToChain(toChainId),
      amount: codecToBalance(value),
    }
  })
}

/**
 * Query unconfirmed transfers between chains.
 *
 * Returns transfers that have been initiated but not yet confirmed or rejected.
 * Unconfirmed transfers are in a pending state and will either be confirmed or cancelled.
 *
 * This storage is only available on the consensus chain where all transfer tracking is maintained.
 *
 * @param api - The API promise instance for the consensus chain
 * @param from - Source chain: 'consensus' or { domainId: number }. Defaults to 'consensus'.
 * @param to - Optional destination chain. If provided, returns a specific transfer amount. If omitted, returns all unconfirmed transfers from the source chain.
 * @returns Transfer amount as bigint for a specific route, or array of all unconfirmed transfers from the source chain
 *
 * @example
 * ```typescript
 * // All unconfirmed transfers from consensus
 * const fromConsensus = await unconfirmedTransfers(api)
 * // fromConsensus: [{ from: 'consensus', to: { domainId: 0 }, amount: 1000000000000n }]
 *
 * // All unconfirmed transfers from domain 1
 * const fromDomain = await unconfirmedTransfers(api, { domainId: 1 })
 *
 * // Specific transfer from consensus to domain 1
 * const specific = await unconfirmedTransfers(api, 'consensus', { domainId: 1 })
 * // specific: 1000000000000n
 * ```
 */
export const unconfirmedTransfers = async (
  api: ApiPromise,
  from: Chain = 'consensus',
  to?: Chain,
): Promise<bigint | Transfer[]> => {
  const fromChainId = chainToChainIdCodec(api, from)

  if (to !== undefined) {
    const toChainId = chainToChainIdCodec(api, to)
    const codec = await api.query.transporter.unconfirmedTransfers(fromChainId, toChainId)
    return codecToBalance(codec)
  }

  const entries = await api.query.transporter.unconfirmedTransfers.entries(fromChainId)
  return entries.map(([key, value]) => {
    // Extract toChainId from storage key (second key in DoubleMap)
    const toChainIdCodec = key.args[1]
    const toChainId = toChainIdCodec.toJSON() as ChainId
    return {
      from,
      to: chainIdToChain(toChainId),
      amount: codecToBalance(value),
    }
  })
}
