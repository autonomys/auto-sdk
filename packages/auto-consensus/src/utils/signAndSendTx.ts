// file: src/utils/signAndSendTx.ts

import type { AddressOrPair, ISubmittableResult, SubmittableExtrinsic } from '@autonomys/auto-utils'
import type { Events } from '../types/events'
import type { EventsValidated, TransactionSignedAndSend } from '../types/transaction'
import { detectTxSuccess } from './detectTxSuccess'
import { expectSuccessfulTxEvent } from './events'
import { validateEvents } from './validateEvents'

export const signAndSendTx = async (
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  eventsExpected: Events = expectSuccessfulTxEvent,
  log: boolean = false,
): Promise<TransactionSignedAndSend> => {
  let success = false
  let txHashHex: string | undefined = undefined
  let blockHash: string | undefined = undefined
  let eventsValidated: EventsValidated = { expected: [], found: [] }
  await new Promise<void>((resolve, reject) => {
    tx.signAndSend(sender, ({ events, status, txHash }) => {
      if (status.isInBlock) {
        txHashHex = txHash.toHex()
        blockHash = status.asInBlock.toHex()
        if (log) console.log('Successful tx', txHashHex, 'in block', blockHash)

        success = detectTxSuccess(events)

        if (eventsExpected.length > 0) {
          const _events = validateEvents(events, eventsExpected, txHashHex, blockHash, log)
          if (_events.expected.length === 0) resolve()
          else reject(new Error('Events not found'))
        } else resolve()
      } else if (
        status.isRetracted ||
        status.isFinalityTimeout ||
        status.isDropped ||
        status.isInvalid
      ) {
        if (log) console.error('Transaction failed')
        reject(new Error('Transaction failed'))
      }
    })
  })

  return { success, txHash: txHashHex, blockHash, events: eventsValidated }
}
