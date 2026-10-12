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

  // Check if it's an empty Codec or Option None
  if ('isEmpty' in codec && (codec as { isEmpty: boolean }).isEmpty) {
    return null
  }
  if ('isNone' in codec && (codec as { isNone: boolean }).isNone) {
    return null
  }

  // Convert to JSON first to get the structure
  const json =
    'toJSON' in codec && typeof (codec as { toJSON: () => unknown }).toJSON === 'function'
      ? (codec as { toJSON: () => unknown }).toJSON()
      : codec

  if (!json || typeof json !== 'object') return null

  const channel = json as Record<string, unknown>

  // Convert field names from Rust snake_case / camelCase to Channel type
  const state = (channel.state ?? channel.status) as string
  const stateMap: Record<string, ChannelState> = {
    Initiated: 'Initiated',
    Open: 'Open',
    Closed: 'Closed',
  }

  return {
    channelId: String(channel.channel_id ?? channel.channelId ?? '0'),
    state: stateMap[state] ?? 'Initiated',
    nextInboxNonce: String(channel.next_inbox_nonce ?? channel.nextInboxNonce ?? '0'),
    nextOutboxNonce: String(channel.next_outbox_nonce ?? channel.nextOutboxNonce ?? '0'),
    latestResponseReceivedMessageNonce:
      channel.latest_response_received_message_nonce !== null &&
      channel.latest_response_received_message_nonce !== undefined
        ? String(channel.latest_response_received_message_nonce)
        : channel.latestResponseReceivedMessageNonce !== null &&
            channel.latestResponseReceivedMessageNonce !== undefined
          ? String(channel.latestResponseReceivedMessageNonce)
          : null,
    maxOutgoingMessages: Number(channel.max_outgoing_messages ?? channel.maxOutgoingMessages ?? 0),
    maybeOwner:
      channel.maybe_owner !== null && channel.maybe_owner !== undefined
        ? String(channel.maybe_owner)
        : channel.maybeOwner !== null && channel.maybeOwner !== undefined
          ? String(channel.maybeOwner)
          : null,
    channelReserveFee: String(channel.channel_reserve_fee ?? channel.channelReserveFee ?? '0'),
  }
}

/**
 * Converts balance Codec to bigint.
 * Used when reading balances from storage.
 *
 * @internal
 */
export const codecToBalance = (codec: unknown): bigint => {
  if (codec === null || codec === undefined) return BigInt(0)

  if (typeof codec === 'bigint') return codec
  if (typeof codec === 'number') {
    if (!Number.isFinite(codec)) return BigInt(0)
    return BigInt(Math.trunc(codec))
  }

  if (typeof codec === 'string') {
    const trimmed = codec.trim()
    if (!trimmed) return BigInt(0)
    try {
      return BigInt(trimmed)
    } catch {
      return BigInt(0)
    }
  }

  if (typeof codec === 'object') {
    // Polkadot Codec with native .toBigInt()
    if (
      'toBigInt' in codec &&
      typeof (codec as { toBigInt: () => bigint }).toBigInt === 'function'
    ) {
      try {
        return (codec as { toBigInt: () => bigint }).toBigInt()
      } catch {
        // fallback
      }
    }

    // Codec with toJSON method
    if ('toJSON' in codec && typeof (codec as { toJSON: () => unknown }).toJSON === 'function') {
      try {
        const json = (codec as { toJSON: () => unknown }).toJSON()
        if (
          json !== codec &&
          (typeof json === 'string' || typeof json === 'number' || typeof json === 'bigint')
        ) {
          return codecToBalance(json)
        }
      } catch {
        // fallback
      }
    }

    // Custom toString method (not Object.prototype.toString)
    if (
      'toString' in codec &&
      typeof (codec as { toString: () => string }).toString === 'function' &&
      (codec as { toString: () => string }).toString !== Object.prototype.toString
    ) {
      try {
        const str = (codec as { toString: () => string }).toString().trim()
        return BigInt(str)
      } catch {
        return BigInt(0)
      }
    }
  }

  return BigInt(0)
}
