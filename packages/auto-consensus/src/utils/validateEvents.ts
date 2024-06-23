import type { EventRecord } from '@polkadot/types/interfaces'
import type { Events } from '../types/events'
import { expectSuccessfulTxEvent } from './events'

export const validateEvents = (
  events: EventRecord[],
  eventsExpected: Events = expectSuccessfulTxEvent,
  tx: string,
  block: string,
  log: boolean = false,
) => {
  const _eventsExpected =
    typeof eventsExpected === 'string'
      ? [eventsExpected]
      : eventsExpected.map((e: string | string[]) => (typeof e === 'string' ? [e] : e)).flat()

  events.forEach(({ event: { data, method, section } }) => {
    const index = _eventsExpected.indexOf(`${section}.${method}`)
    if (index > -1) _eventsExpected.splice(index, 1)
    else if (log)
      console.log('Event not expected', `${section}.${method}`, 'tx', tx, 'block', block)
  })
  if (_eventsExpected.length > 0)
    console.log('Events not found', _eventsExpected, 'tx', tx, 'block', block)

  return _eventsExpected
}
