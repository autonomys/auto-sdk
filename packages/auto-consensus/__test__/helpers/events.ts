export type ActionEvents = string | string[]
export type Events = ActionEvents | ActionEvents[]

export const system: {
  [key: string]: string
} = {
  success: 'system.ExtrinsicSuccess',
  failure: 'system.ExtrinsicFailed',
}

export const balances: {
  [key: string]: string
} = {
  withdraw: 'balances.Withdraw',
}

export const transactionPayment: {
  [key: string]: string
} = {
  feePaid: 'transactionPayment.TransactionFeePaid',
}

export const domains: {
  [key: string]: string
} = {
  storageFeeDeposited: 'system.StorageFeeDeposited',
  operatorRegistered: 'system.OperatorRegistered',
}

export const events: {
  [key: string]: ActionEvents
} = {
  transfer: [balances.withdraw, 'balances.Transfer'],
  operatorRegistered: [
    balances.withdraw,
    transactionPayment.feePaid,
    domains.storageFeeDeposited,
    domains.operatorRegistered,
    system.success,
  ],
  withdrawStake: [balances.withdraw, transactionPayment.feePaid, system.success],
  unlockFunds: [balances.withdraw, transactionPayment.feePaid, system.success],
  operatorDeRegistered: [balances.withdraw, transactionPayment.feePaid, system.success],
  ...system,
  ...balances,
  ...transactionPayment,
}
