import type { ApiPromise } from '@autonomys/auto-utils'

export const batch = async (api: ApiPromise, txs: any[]) => await api.tx.utility.batch(txs)
