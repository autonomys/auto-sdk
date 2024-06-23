export type ActionEvents = string | string[]
export type Events = ActionEvents | ActionEvents[]

// Define specific extrinsic keys for events
export type EventKeys =
  | 'transfer'
  | 'operatorRegistered'
  | 'operatorNominated'
  | 'operatorDeRegistered'
  | 'withdrawStake'
  | 'unlockFunds'
  | 'forceDomainEpochTransition'
