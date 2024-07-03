// file: src/types/transaction.ts

import type { Events } from '../types/events'

export type EventsValidated = {
  expected: Events
  found: Events
}

export type TransactionSignedAndSend = {
  success: boolean
  txHash: string | undefined
  blockHash: string | undefined
  events: EventsValidated
}
