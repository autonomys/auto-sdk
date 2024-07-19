import type { EventRecord } from '@polkadot/types/interfaces'

export type ActionEvents = string | string[]
export type Events = ActionEvents | ActionEvents[]

export type { EventRecord }
