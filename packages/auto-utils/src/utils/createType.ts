import type { ApiPromise } from '@polkadot/api'
import { createType } from '@polkadot/types'

export const createAccountIdType = (api: ApiPromise, address: string) =>
  createType(api.registry, 'AccountId', address).toU8a()
