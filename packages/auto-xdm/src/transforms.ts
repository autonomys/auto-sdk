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

  // Use toPrimitive() to obtain decimal values and camelCase keys
  const raw =
    'toPrimitive' in codec &&
    typeof (codec as { toPrimitive: () => unknown }).toPrimitive === 'function'
      ? (codec as { toPrimitive: () => unknown }).toPrimitive()
      : codec

  if (!raw || typeof raw !== 'object') return null

  const channel = raw as Record<string, unknown>

  const state = channel.state as string
  const stateMap: Record<string, ChannelState> = {
    Initiated: 'Initiated',
    Open: 'Open',
    Closed: 'Closed',
  }

  return {
    channelId: String(channel.channelId ?? '0'),
    state: stateMap[state] ?? 'Initiated',
    nextInboxNonce: String(channel.nextInboxNonce ?? '0'),
    nextOutboxNonce: String(channel.nextOutboxNonce ?? '0'),
    latestResponseReceivedMessageNonce:
      channel.latestResponseReceivedMessageNonce !== null &&
      channel.latestResponseReceivedMessageNonce !== undefined
        ? String(channel.latestResponseReceivedMessageNonce)
        : null,
    maxOutgoingMessages: Number(channel.maxOutgoingMessages ?? 0),
    maybeOwner:
      channel.maybeOwner !== null && channel.maybeOwner !== undefined
        ? String(channel.maybeOwner)
        : null,
    channelReserveFee: String(channel.channelReserveFee ?? '0'),
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

  // At this point, codec is guaranteed to be truthy (due to early return above)
  return BigInt(String(codec))
}
