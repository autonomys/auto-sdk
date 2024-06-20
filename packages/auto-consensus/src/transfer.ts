import type { ApiPromise } from '@polkadot/api'

export type Amount = BigInt | number | string

export const transfer = async (
  api: ApiPromise,
  receiver: string,
  amount: Amount,
  allowDeath?: boolean,
) => {
  // Transfer the tokens
  return !allowDeath
    ? await api.tx.balances.transferKeepAlive(receiver, amount)
    : await api.tx.balances.transferAllowDeath(receiver, amount)
}

export const transferAll = async (
  api: ApiPromise,
  receiver: string,
  keepAlive: boolean = false,
) => {
  // Transfer all the tokens
  return await api.tx.balances.transferAll(receiver, keepAlive)
}
