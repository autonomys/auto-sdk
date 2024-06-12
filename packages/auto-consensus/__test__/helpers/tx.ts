import type { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types'
import type { EventRecord } from '@polkadot/types/interfaces'
import type { ISubmittableResult } from '@polkadot/types/types'
import type { Events } from './events'

const validateEvents = (events: EventRecord[], eventsExpected: Events, log: boolean = true) => {
  const _eventsExpected =
    typeof eventsExpected === 'string'
      ? [eventsExpected]
      : eventsExpected.map((e: string | string[]) => (typeof e === 'string' ? [e] : e)).flat()

  events.forEach(({ event: { data, method, section } }) => {
    if (log) console.log(`${section}.${method}`, data.toString())
    const index = _eventsExpected.indexOf(`${section}.${method}`)
    if (index > -1) _eventsExpected.splice(index, 1)
    else if (log) console.log('Event not expected', `${section}.${method}`)
  })
  if (_eventsExpected.length > 0) console.log('Events not found', _eventsExpected)

  expect(_eventsExpected).toHaveLength(0)

  return _eventsExpected
}

export const signAndSendTx = async (
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  eventsExpected: Events = [],
  log: boolean = true,
) => {
  let blockHash: string | undefined = undefined
  await new Promise<void>((resolve, reject) => {
    tx.signAndSend(sender, ({ events, status }) => {
      if (status.isInBlock) {
        blockHash = status.asInBlock.toHex()
        if (log) console.log('Successful tx with block hash ' + blockHash)

        if (eventsExpected.length > 0) {
          eventsExpected = validateEvents(events, eventsExpected, log)
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
      } else if (log) console.log('Status of tx: ' + status.type)
    })
  })
  expect(blockHash).toBeDefined()

  return blockHash
}
