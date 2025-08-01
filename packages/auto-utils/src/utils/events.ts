// file: src/utils/events.ts

/**
 * Enumeration of blockchain event types for categorizing events.
 * 
 * This enum provides a structured way to reference different categories of
 * blockchain events, making event handling more organized and type-safe.
 */
// Enum for Event Types
export const enum Type {
  system = 'system',
}

/**
 * Creates a standardized event name by combining type and event name.
 * 
 * This utility function creates consistent event names following the pattern
 * "type.eventName", which matches the format used by Polkadot.js for blockchain events.
 * 
 * @param type - The event type category from the Type enum.
 * @param event - The specific event name within that category.
 * @returns A formatted event name string in the format "type.event".
 * 
 * @example
 * import { eventName, Type } from '@autonomys/auto-utils'
 * 
 * // Create system event names
 * const successEvent = eventName(Type.system, 'ExtrinsicSuccess')
 * console.log(successEvent) // Output: "system.ExtrinsicSuccess"
 * 
 * const failureEvent = eventName(Type.system, 'ExtrinsicFailed')
 * console.log(failureEvent) // Output: "system.ExtrinsicFailed"
 * 
 * // Use in event validation
 * const expectedEvents = [
 *   eventName(Type.system, 'ExtrinsicSuccess'),
 *   'balances.Transfer' // Can also use direct strings
 * ]
 */
// Utility Function for Event Names
export const eventName = (type: Type, event: string) => `${type}.${event}`

/**
 * Collection of system-level blockchain events.
 * 
 * This object contains standardized names for system events that are common
 * across all Polkadot-based blockchains, providing easy access to frequently
 * used event names for transaction monitoring and validation.
 */
// System Events
const system: {
  [key: string]: string
} = {
  failure: eventName(Type.system, 'ExtrinsicFailed'),
  newAccount: eventName(Type.system, 'NewAccount'),
  success: eventName(Type.system, 'ExtrinsicSuccess'),
}

/**
 * Organized collection of event groups by category.
 * 
 * This object provides structured access to different categories of blockchain
 * events, making it easier to reference and validate specific event types
 * in transaction monitoring and testing scenarios.
 * 
 * @example
 * import { eventsGroup } from '@autonomys/auto-utils'
 * 
 * // Access system events
 * console.log(eventsGroup.system.success) // Output: "system.ExtrinsicSuccess"
 * console.log(eventsGroup.system.failure) // Output: "system.ExtrinsicFailed"
 * 
 * // Use in transaction validation
 * const expectedSystemEvents = [
 *   eventsGroup.system.success,
 *   eventsGroup.system.newAccount
 * ]
 */
// Group of Events
export const eventsGroup = {
  system,
}

/**
 * Default array of events expected for successful transactions.
 * 
 * This array contains the standard events that indicate a transaction was
 * successfully executed. It's used as the default expected events list
 * in transaction signing and validation functions.
 * 
 * @example
 * import { expectSuccessfulTxEvent, signAndSendTx } from '@autonomys/auto-utils'
 * 
 * // Use as default expected events (this is automatic)
 * const result = await signAndSendTx(sender, tx)
 * 
 * // Or explicitly specify (same as default)
 * const result2 = await signAndSendTx(sender, tx, {}, expectSuccessfulTxEvent)
 * 
 * // Combine with custom events
 * const customExpectedEvents = [
 *   ...expectSuccessfulTxEvent,
 *   'balances.Transfer',
 *   'domains.OperatorNominated'
 * ]
 */
// Export a default success event
export const expectSuccessfulTxEvent = [system.success]
