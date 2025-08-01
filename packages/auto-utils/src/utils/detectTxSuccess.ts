// file: src/utils/detectTxSuccess.ts

import type { EventRecord } from '../types/event'
import { expectSuccessfulTxEvent } from './events'

/**
 * Detects if a transaction was successful by checking for success events.
 * 
 * This function examines the events emitted by a transaction to determine
 * if it was successful. It looks for events that are known to indicate
 * successful transaction execution, such as 'system.ExtrinsicSuccess'.
 * 
 * @param events - Array of EventRecord objects emitted by the transaction.
 * @returns True if the transaction was successful, false otherwise.
 * 
 * @example
 * import { detectTxSuccess } from '@autonomys/auto-utils'
 * 
 * // Check transaction success from events
 * const events = [] // events from transaction result
 * const isSuccessful = detectTxSuccess(events)
 * 
 * if (isSuccessful) {
 *   console.log('Transaction completed successfully')
 * } else {
 *   console.log('Transaction failed or had no success events')
 * }
 * 
 * // Use with signAndSend result
 * tx.signAndSend(sender, (result) => {
 *   if (result.status.isInBlock) {
 *     const success = detectTxSuccess(result.events)
 *     console.log('Transaction success:', success)
 *   }
 * })
 */
export const detectTxSuccess = (events: EventRecord[]): boolean => {
  events.forEach(({ event: { method, section } }) => {
    if (expectSuccessfulTxEvent.indexOf(`${section}.${method}`) > -1) return true
  })

  return false
}
