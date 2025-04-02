// file: src/utils/validateEvents.ts

import type { EventRecord, Events, EventsValidated } from '../types'
import { expectSuccessfulTxEvent } from './events'

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
      : eventsExpected.map((e: string | string[]) => (typeof e === 'string' ? [e] : e)).flat()
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
