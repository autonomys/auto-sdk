import type { ApiPromise, ISubmittableResult, SubmittableExtrinsic } from '@autonomys/auto-utils'
import { chainToChainIdCodec } from './transforms'
import type { Chain } from './types'

/**
 * Creates a transaction to initiate a channel to a destination chain.
 *
 * This function creates a transaction but does not submit it. The returned transaction
 * must be signed and sent using `signAndSendTx` or similar methods.
 *
 * Before initiating a channel, ensure the destination chain is in the allowlist.
 * Use `chainAllowlist()` to check which chains can open channels with the current chain.
 *
 * @param api - The API instance for the source chain
 * @param destination - The destination chain: 'consensus' or { domainId: number }
 * @returns A transaction that can be signed and submitted
 *
 * @example
 * ```typescript
 * // Initiate channel to consensus chain
 * const tx = initiateChannel(api, 'consensus')
 * await signAndSendTx(keyringPair, tx, {}, [], false)
 *
 * // Initiate channel to domain 0
 * const tx = initiateChannel(api, { domainId: 0 })
 * await signAndSendTx(keyringPair, tx, {}, [], false)
 *
 * // Check if destination is allowed before initiating
 * const allowlist = await chainAllowlist(api)
 * const canOpenToDomain0 = allowlist.some(chain => chain !== 'consensus' && chain.domainId === 0)
 * if (canOpenToDomain0) {
 *   const tx = initiateChannel(api, { domainId: 0 })
 *   await signAndSendTx(keyringPair, tx, {}, [], false)
 * }
 * ```
 */
export const initiateChannel = (
  api: ApiPromise,
  destination: Chain,
): SubmittableExtrinsic<'promise', ISubmittableResult> => {
  const destinationChainId = chainToChainIdCodec(api, destination)
  return api.tx.messenger.initiateChannel(destinationChainId)
}

/**
 * Creates a transaction to close an existing channel to a destination chain.
 *
 * This function creates a transaction but does not submit it. The returned transaction
 * must be signed and sent using `signAndSendTx` or similar methods.
 *
 * Closing a channel stops further message exchanges on that channel. You can query
 * existing channels using `channels()` to find the channel ID to close.
 *
 * @param api - The API instance for the chain where the channel exists
 * @param destination - The destination chain of the channel: 'consensus' or { domainId: number }
 * @param channelId - The channel ID to close (number, string, or bigint)
 * @returns A transaction that can be signed and submitted
 *
 * @example
 * ```typescript
 * // Close channel 0 to domain 0
 * const tx = closeChannel(api, { domainId: 0 }, 0)
 * await signAndSendTx(keyringPair, tx, {}, [], false)
 *
 * // Close channel 1 to consensus chain
 * const tx = closeChannel(api, 'consensus', 1)
 * await signAndSendTx(keyringPair, tx, {}, [], false)
 *
 * // Query channel before closing to verify it exists
 * const channel = await channels(api, { domainId: 0 }, 0)
 * if (channel && channel.state === 'Open') {
 *   const tx = closeChannel(api, { domainId: 0 }, 0)
 *   await signAndSendTx(keyringPair, tx, {}, [], false)
 * }
 * ```
 */
export const closeChannel = (
  api: ApiPromise,
  destination: Chain,
  channelId: number | string | bigint,
): SubmittableExtrinsic<'promise', ISubmittableResult> => {
  const destinationChainId = chainToChainIdCodec(api, destination)
  const channelIdCodec = api.createType('U256', channelId)
  return api.tx.messenger.closeChannel(destinationChainId, channelIdCodec)
}
