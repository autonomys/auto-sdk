import type { ApiPromise } from '@autonomys/auto-utils'

/**
 * Creates a remark transaction for adding arbitrary data to the blockchain.
 *
 * Remark transactions allow you to include arbitrary data in the blockchain without
 * affecting the state. This is useful for timestamping data, adding metadata,
 * or including custom information that needs to be permanently recorded.
 *
 * @param api - The connected API promise instance
 * @param remark - The remark data to include in the transaction (as string or bytes)
 * @param withEvent - Whether to emit an event for this remark (default: false)
 * @returns A submittable remark transaction
 *
 * @example
 * ```typescript
 * import { remark } from '@autonomys/auto-consensus'
 * import { activate, signAndSendTx } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 *
 * // Create a simple remark
 * const remarkTx = remark(api, 'Hello, blockchain!')
 *
 * // Create a remark with event
 * const remarkWithEventTx = remark(api, JSON.stringify({ timestamp: Date.now() }), true)
 *
 * // Sign and send the transaction
 * await signAndSendTx(sender, remarkTx)
 * ```
 */
export const remark = (api: ApiPromise, remark: string, withEvent?: boolean) =>
  !withEvent ? api.tx.system.remark(remark) : api.tx.system.remarkWithEvent(remark)
