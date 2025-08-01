// file: src/utils/validateEvents.ts

import type { EventRecord, Events, EventsValidated } from '../types'
import { expectSuccessfulTxEvent } from './events'

/**
 * Validates that expected blockchain events were emitted during transaction execution.
 * 
 * This function checks if all expected events were found in the transaction's event list.
 * It's essential for ensuring that transactions not only succeeded but also produced
 * the specific side effects (events) that were expected. The function supports both
 * string and nested array formats for expected events.
 * 
 * @param events - Array of EventRecord objects emitted by the transaction.
 * @param eventsExpected - Expected events in various formats (string, array of strings, or nested arrays).
 * @param tx - Transaction hash for logging purposes.
 * @param block - Block hash where the transaction was included for logging purposes.
 * @param log - Whether to log unexpected events and missing events. Defaults to false.
 * @returns EventsValidated object containing arrays of expected (missing) and found events.
 * 
 * @example
 * import { validateEvents, expectSuccessfulTxEvent } from '@autonomys/auto-utils'
 * 
 * // Basic validation with system success events
 * const events = [] // event records from transaction
 * const validation = validateEvents(
 *   events,
 *   expectSuccessfulTxEvent,
 *   '0x1234...', // transaction hash
 *   '0x5678...', // block hash
 *   true // enable logging
 * )
 * 
 * if (validation.expected.length === 0) {
 *   console.log('All expected events found:', validation.found)
 * } else {
 *   console.log('Missing events:', validation.expected)
 * }
 * 
 * // Validate multiple specific events
 * const transferValidation = validateEvents(
 *   events,
 *   ['system.ExtrinsicSuccess', 'balances.Transfer'],
 *   txHash,
 *   blockHash
 * )
 * 
 * // Validate complex event patterns
 * const stakingValidation = validateEvents(
 *   events,
 *   [
 *     'system.ExtrinsicSuccess',
 *     ['domains.OperatorNominated', 'domains.StakeAdded'], // Either of these
 *     'balances.Transfer'
 *   ],
 *   txHash,
 *   blockHash,
 *   true
 * )
 * 
 * // Use in transaction monitoring
 * const expectedDomainEvents = [
 *   'system.ExtrinsicSuccess',
 *   'domains.DomainInstantiated',
 *   'balances.Transfer'
 * ]
 * const domainValidation = validateEvents(events, expectedDomainEvents, txHash, blockHash)
 * 
 * // Check if validation passed
 * const isValid = domainValidation.expected.length === 0
 * console.log('Domain creation valid:', isValid)
 */
export const validateEvents = (
  events: EventRecord[],
  eventsExpected: Events = expectSuccessfulTxEvent,
  tx: string,
  block: string,
  log: boolean = false,
): EventsValidated => {
  const _eventsExpected =
    typeof eventsExpected === 'string'
      ? [eventsExpected]
      : eventsExpected.reduce((acc: string[], e: string | string[]) => 
          acc.concat(typeof e === 'string' ? [e] : e), [])
  const found: Events = []

  events.forEach(({ event: { method, section } }) => {
    const index = _eventsExpected.indexOf(`${section}.${method}`)
    if (index > -1) {
      _eventsExpected.splice(index, 1)
      found.push(`${section}.${method}`)
    } else if (log)
      console.log('Event not expected', `${section}.${method}`, 'tx', tx, 'block', block)
  })
  if (_eventsExpected.length > 0)
    console.log('Events not found', _eventsExpected, 'tx', tx, 'block', block)

  return { expected: _eventsExpected, found }
}
