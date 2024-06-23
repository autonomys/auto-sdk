import type { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'
import type { Events } from '../types/events'
import { detectTxSuccess } from './detectTxSuccess'
import { expectSuccessfulTxEvent } from './events'
import { validateEvents } from './validateEvents'

export const signAndSendTx = async (
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  eventsExpected: Events = expectSuccessfulTxEvent,
  log: boolean = false,
) => {
  let success = false
  let txHashHex: string | undefined = undefined
  let blockHash: string | undefined = undefined
  await new Promise<void>((resolve, reject) => {
    tx.signAndSend(sender, ({ events, status, txHash }) => {
      if (status.isInBlock) {
        txHashHex = txHash.toHex()
        blockHash = status.asInBlock.toHex()
        if (log) console.log('Successful tx', txHashHex, 'in block', blockHash)

        success = detectTxSuccess(events)

        if (eventsExpected.length > 0) {
          validateEvents(events, eventsExpected, txHashHex, blockHash, log)
          if (eventsExpected.length === 0) resolve()
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

  return { success, txHash: txHashHex, blockHash, eventsExpectedMissing: eventsExpected }
}
