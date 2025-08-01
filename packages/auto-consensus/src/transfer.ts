// file: src/transfer.ts

import type { ApiPromise } from '@autonomys/auto-utils'

export type Amount = bigint | number | string

/**
 * Creates a token transfer transaction.
 *
 * This function creates a transaction to transfer tokens from the sender to a recipient.
 * It supports two transfer modes: keepAlive (default) which ensures the sender maintains
 * the existential deposit, and allowDeath which allows the sender account to be reaped.
 *
 * @param api - The connected API promise instance
 * @param receiver - The recipient's account address
 * @param amount - The amount to transfer (in smallest token units)
 * @param allowDeath - Whether to allow the sender account to be reaped (default: false)
 * @returns A submittable transfer transaction
 *
 * @example
 * ```typescript
 * import { transfer } from '@autonomys/auto-consensus'
 * import { activate, signAndSendTx } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'gemini-3h' })
 *
 * // Transfer 1 AI3 (keeping account alive)
 * const keepAliveTx = transfer(api, 'recipient_address', '1000000000000000000')
 *
 * // Transfer allowing account death
 * const allowDeathTx = transfer(api, 'recipient_address', '500000000000000000', true)
 *
 * // Sign and send the transaction
 * await signAndSendTx(sender, keepAliveTx)
 * ```
 */
export const transfer = (
  api: ApiPromise,
  receiver: string,
  amount: Amount,
  allowDeath?: boolean,
) => {
  // Transfer the tokens
  return !allowDeath
    ? api.tx.balances.transferKeepAlive(receiver, amount)
    : api.tx.balances.transferAllowDeath(receiver, amount)
}

/**
 * Creates a transaction to transfer all available tokens.
 *
 * This function creates a transaction that transfers the entire available balance
 * of the sender to the recipient, minus transaction fees. It can optionally keep
 * the sender account alive by maintaining the existential deposit.
 *
 * @param api - The connected API promise instance
 * @param receiver - The recipient's account address
 * @param keepAlive - Whether to keep the sender account alive by maintaining existential deposit (default: false)
 * @returns A submittable transfer-all transaction
 *
 * @example
 * ```typescript
 * import { transferAll } from '@autonomys/auto-consensus'
 * import { activate, signAndSendTx } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'gemini-3h' })
 *
 * // Transfer all tokens and close account
 * const transferAllTx = transferAll(api, 'recipient_address', false)
 *
 * // Transfer all tokens but keep account alive
 * const transferAllKeepAliveTx = transferAll(api, 'recipient_address', true)
 *
 * // Sign and send the transaction
 * await signAndSendTx(sender, transferAllTx)
 * ```
 */
export const transferAll = (api: ApiPromise, receiver: string, keepAlive: boolean = false) => {
  // Transfer all the tokens
  return api.tx.balances.transferAll(receiver, keepAlive)
}
