// file: src/transfer.ts

import type { StringNumberOrBigInt } from '@autonomys/auto-consensus'
import type { ApiPromise } from '@autonomys/auto-utils'
import type { Account, ChainOrDomain } from './types'

export const transfer = async (
  api: ApiPromise,
  destination: ChainOrDomain,
  receiver: Account,
  amount: StringNumberOrBigInt,
) => {
  return await api.tx.transporter.transfer(
    {
      destination,
      receiver,
    },
    amount,
  )
}
