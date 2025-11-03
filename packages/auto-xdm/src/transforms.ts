import { Codec, createDomainsChainIdType, type ApiPromise } from '@autonomys/auto-utils'
import type { Chain, ChainId, Channel, ChannelState } from './types'

/**
 * Converts ChainId (JSON representation) to Chain (friendly type).
 * Used when reading from storage.
 *
 * @internal
 */
export const chainIdToChain = (chainId: ChainId): Chain => {
  if ('consensus' in chainId) {
    return 'consensus'
  }
  return { domainId: chainId.domain }
}

/**
 * Converts Chain (friendly type) to ChainId Codec.
 * Used for storage queries that require a ChainId.
 *
 * @internal
 */
export const chainToChainIdCodec = (api: ApiPromise, chain: Chain): Codec => {
  if (chain === 'consensus') {
    return createDomainsChainIdType(api)
  }
  return createDomainsChainIdType(api, chain.domainId)
}

/**
 * Helper to convert Channel Codec to friendly Channel type
 * @internal
 */
export const codecToChannel = (codec: unknown): Channel | null => {
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
 * Converts balance Codec to bigint.
 * Used when reading balances from storage.
 *
 * @internal
 */
export const codecToBalance = (codec: unknown): bigint => {
  if (!codec || typeof codec !== 'object') return BigInt(0)

  // Handle toString method (common for Polkadot Codecs)
  if ('toString' in codec && typeof (codec as { toString: () => string }).toString === 'function') {
    return BigInt((codec as { toString: () => string }).toString())
  }

  // Handle Codec with toJSON method
  if ('toJSON' in codec && typeof (codec as { toJSON: () => unknown }).toJSON === 'function') {
    const json = (codec as { toJSON: () => unknown }).toJSON()
    return BigInt(String(json ?? 0))
  }

  return BigInt(String(codec ?? 0))
}
