// file: src/types/events.ts

export type ActionEvents = string | string[]
export type Events = ActionEvents | ActionEvents[]

// Define specific extrinsic keys for events
export type EventKeys =
  | 'transfer'
  | 'operatorRegistered'
  | 'operatorNominated'
  | 'operatorDeregistered'
  | 'withdrawStake'
  | 'unlockFunds'
  | 'forceDomainEpochTransition'
