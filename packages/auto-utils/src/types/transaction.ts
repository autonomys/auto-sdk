// file: src/types/transaction.ts

import type { SignerOptions } from '@polkadot/api/types'
import type { ActionEvents } from '../types/event'

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

export { SignerOptions }
