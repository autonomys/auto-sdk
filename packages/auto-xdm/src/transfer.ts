// file: src/transfer.ts

import type { ApiPromise } from '@autonomys/auto-utils'

export type Amount = BigInt | number | string
export type Consensus = {
  type: 'consensus'
}
export type Domain = {
  type: 'domain'
  domainId: number
}
export type ChainOrDomain = Consensus | Domain

export const transfer = async (
  api: ApiPromise,
  destination: ChainOrDomain,
  receiver: string,
  amount: Amount,
) => {
  // Transfer the tokens
  return await api.tx.transporter.transfer(
    {
      destination,
      receiver,
    },
    amount,
  )
}
