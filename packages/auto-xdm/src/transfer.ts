// file: src/transfer.ts

import type { StringNumberOrBigInt } from '@autonomys/auto-consensus'
import type { ApiPromise, Codec } from '@autonomys/auto-utils'
import {
  createTransporterToConsensusType,
  createTransporterToDomainAccount20Type,
  createTransporterToDomainAccount32Type,
} from '@autonomys/auto-utils'

export const transfer = async (
  api: ApiPromise,
  destination: Codec,
  amount: StringNumberOrBigInt,
) => {
  return await api.tx.transporter.transfer(destination, amount)
}

export const transferToConsensus = async (
  api: ApiPromise,
  accountId32: string,
  amount: StringNumberOrBigInt,
) => {
  const destination = createTransporterToConsensusType(api, accountId32)
  return await transfer(api, destination, amount)
}

export const transferToDomainAccount20Type = async (
  api: ApiPromise,
  destinationDomainId: string | number,
  accountId20: string,
  amount: StringNumberOrBigInt,
) => {
  const destination = createTransporterToDomainAccount20Type(api, destinationDomainId, accountId20)
  return await transfer(api, destination, amount)
}

export const transferToDomainAccount32Type = async (
  api: ApiPromise,
  destinationDomainId: string | number,
  accountId32: string,
  amount: StringNumberOrBigInt,
) => {
  const destination = createTransporterToDomainAccount32Type(api, destinationDomainId, accountId32)
  return await transfer(api, destination, amount)
}
