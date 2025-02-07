// file: src/types/index.ts

import { query } from '@autonomys/auto-consensus'
import type { ApiPromise, Codec } from '@autonomys/auto-utils'

export const chainAllowlist = async (api: ApiPromise) => {
  return await query<Codec>(api, 'messenger.chainAllowlist', [])
}

export const allCancelledTransfers = async (api: ApiPromise) => {
  return await query<Codec>(api, 'transporter.cancelledTransfers', [])
}

export const chainTransfers = async (api: ApiPromise) => {
  return await query<Codec>(api, 'transporter.chainTransfers', [])
}

export const allDomainBalances = async (api: ApiPromise) => {
  return await query<Codec>(api, 'transporter.domainBalances', [])
}

export const domainBalances = async (api: ApiPromise, domainId: number) => {
  return await query<Codec>(api, 'transporter.domainBalances', [domainId])
}

export const allUnconfirmedTransfers = async (api: ApiPromise) => {
  return await query<Codec>(api, 'transporter.unconfirmedTransfers', [])
}
