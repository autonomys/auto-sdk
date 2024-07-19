// file: src/utils/events.ts

// Enum for Event Types
export const enum Type {
  system = 'system',
}

// Utility Function for Event Names
export const eventName = (type: Type, event: string) => `${type}.${event}`

// System Events
const system: {
  [key: string]: string
} = {
  failure: eventName(Type.system, 'ExtrinsicFailed'),
  newAccount: eventName(Type.system, 'NewAccount'),
  success: eventName(Type.system, 'ExtrinsicSuccess'),
}

// Group of Events
export const eventsGroup = {
  system,
}

// Export a default success event
export const expectSuccessfulTxEvent = [system.success]
