import { ApiPromise } from '@polkadot/api'
import { z } from 'zod'

const TransactionByteFeeSchema = z.object({
  current: z.number(),
  next: z.number(),
})

export const transactionByteFee = async (api: ApiPromise) => {
  await api.isReady

  // Query transactionFees.transactionByteFee
  const transactionByteFee = await api.query.transactionFees
    .transactionByteFee()
    .then((v) => TransactionByteFeeSchema.parse(v.toJSON()))

  return transactionByteFee
}
