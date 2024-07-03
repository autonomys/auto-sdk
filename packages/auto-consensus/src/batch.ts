import type { ApiPromise } from '@polkadot/api'

export const batch = async (api: ApiPromise, txs: any[]) => await api.tx.utility.batch(txs)
