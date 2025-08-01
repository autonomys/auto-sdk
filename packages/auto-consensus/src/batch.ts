/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApiPromise } from '@autonomys/auto-utils'

/**
 * Creates a batch transaction that executes multiple transactions atomically.
 * 
 * This function creates a utility batch transaction that allows multiple operations to be
 * executed together in a single transaction. All operations in the batch will either
 * succeed together or fail together, ensuring atomicity.
 * 
 * @param api - The connected API promise instance
 * @param txs - Array of transaction objects to be batched together
 * @returns A batch transaction that can be signed and submitted
 * 
 * @example
 * ```typescript
 * import { batch, transfer } from '@autonomys/auto-consensus'
 * import { activate, signAndSendTx } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'gemini-3h' })
 * 
 * // Create multiple transfer transactions
 * const tx1 = transfer(api, 'recipient1', '1000000000000')
 * const tx2 = transfer(api, 'recipient2', '2000000000000')
 * 
 * // Batch them together
 * const batchTx = batch(api, [tx1, tx2])
 * 
 * // Sign and send the batch transaction
 * await signAndSendTx(sender, batchTx)
 * ```
 */
export const batch = (api: ApiPromise, txs: any[]) => api.tx.utility.batch(txs)
