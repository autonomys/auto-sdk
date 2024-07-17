import type { ApiPromise } from '@autonomys/auto-utils'

export const batch = (api: ApiPromise, txs: any[]) => api.tx.utility.batch(txs)
