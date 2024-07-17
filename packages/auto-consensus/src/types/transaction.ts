// file: src/types/transaction.ts

import type { ActionEvents } from '../types/events'

export type EventsValidated = {
  expected: ActionEvents[]
  found: ActionEvents[]
}

export type TransactionSignedAndSend = {
  success: boolean
  txHash: string | undefined
  blockHash: string | undefined
  events: EventsValidated
}
