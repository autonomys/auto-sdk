// file: src/utils/events.ts

import type { ActionEvents, EventKeys } from '../types/events'

// Enum for Event Types
export const enum Type {
  system = 'system',
  balances = 'balances',
  transactionPayment = 'transactionPayment',
  domains = 'domains',
  sudo = 'sudo',
}

// Utility Function for Event Names
export const eventName = (type: Type, event: string) => `${type}.${event}`

// System Events
const system: {
  [key: string]: string
} = {
  failure: eventName(Type.system, 'ExtrinsicFailed'),
  newAccount: eventName(Type.system, 'NewAccount'),
  success: eventName(Type.system, 'ExtrinsicSuccess'),
}

// Balances Events
const balances: {
  [key: string]: string
} = {
  deposit: eventName(Type.balances, 'Deposit'),
  endowed: eventName(Type.balances, 'Endowed'),
  transfer: eventName(Type.balances, 'Transfer'),
  withdraw: eventName(Type.balances, 'Withdraw'),
}

// Transaction Payment Events
const transactionPayment: {
  [key: string]: string
} = {
  feePaid: eventName(Type.transactionPayment, 'TransactionFeePaid'),
}

// Domains Events
const domains: {
  [key: string]: string
} = {
  forceDomainEpochTransition: eventName(Type.domains, 'ForceDomainEpochTransition'),
  fundsUnlocked: eventName(Type.domains, 'FundsUnlocked'),
  operatorDeregistered: eventName(Type.domains, 'OperatorDeregistered'),
  operatorNominated: eventName(Type.domains, 'OperatorNominated'),
  operatorRegistered: eventName(Type.domains, 'OperatorRegistered'),
  operatorUnlocked: eventName(Type.domains, 'OperatorUnlocked'),
  storageFeeDeposited: eventName(Type.domains, 'StorageFeeDeposited'),
  withdrawStake: eventName(Type.domains, 'WithdrewStake'),
}

// Sudo Events
const sudo: {
  [key: string]: string
} = {
  sudid: eventName(Type.sudo, 'Sudid'),
}

// Group of Events
export const eventsGroup = {
  system,
  balances,
  transactionPayment,
  domains,
  sudo,
}

// Export a default success event
export const expectSuccessfulTxEvent = [system.success]

// Events Mappings
export const events: { [key in EventKeys]: ActionEvents } = {
  transfer: [balances.withdraw, balances.transfer, transactionPayment.feePaid, system.success],
  operatorRegistered: [
    balances.withdraw,
    domains.storageFeeDeposited,
    domains.operatorRegistered,
    transactionPayment.feePaid,
    system.success,
  ],
  operatorNominated: [
    balances.withdraw,
    balances.transfer,
    domains.storageFeeDeposited,
    domains.operatorNominated,
    transactionPayment.feePaid,
    system.success,
  ],
  operatorDeregistered: [
    balances.withdraw,
    domains.operatorDeregistered,
    transactionPayment.feePaid,
    system.success,
  ],
  withdrawStake: [
    balances.withdraw,
    domains.withdrawStake,
    transactionPayment.feePaid,
    system.success,
  ],
  unlockFunds: [
    balances.withdraw,
    domains.fundsUnlocked,
    transactionPayment.feePaid,
    system.success,
  ],
  forceDomainEpochTransition: [
    balances.withdraw,
    domains.forceDomainEpochTransition,
    sudo.sudid,
    balances.deposit,
    transactionPayment.feePaid,
    system.success,
  ],
}
