import { activate } from '@autonomys/auto-utils'
import { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'

export const totalIssuance = async (networkId?: string) => {
  // Get the api instance for the network
  const api = await activate({ networkId })

  // Get the current total token issuance
  const totalIssuance = await api.query.balances.totalIssuance()

  return totalIssuance
}

export const transfer = async (
  api: ApiPromise,
  sender: KeyringPair,
  receiver: string,
  amount: BigInt | number | string,
) => {
  // Transfer the tokens
  const transfer = await api.tx.balances.transferKeepAlive(receiver, amount).signAndSend(sender)

  return transfer
}
