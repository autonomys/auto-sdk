import { activate } from '@autonomys/auto-utils'
import { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'

type RawBalanceData = {
  free: any
  reserved: any
  frozen: any
  flags: any
}
type BalanceData = {
  free: any
  reserved: any
  frozen: any
}

export const totalIssuance = async (networkId?: string) => {
  // Get the api instance for the network
  const api = await activate({ networkId })

  // Get the current total token issuance
  const totalIssuance = await api.query.balances.totalIssuance()

  return totalIssuance
}

export const balance = async (api: ApiPromise, address: string): Promise<BalanceData> => {
  // Query the balance of the address and parse the data
  try {
    const rawBalance = await api.query.system.account(address)

    const { data } = rawBalance as unknown as { data: RawBalanceData }

    return {
      free: BigInt(data.free.toString()),
      reserved: BigInt(data.reserved.toString()),
      frozen: BigInt(data.frozen.toString()),
    }
  } catch (error) {
    console.log('error', error)
    throw new Error('Error getting balance' + error)
  }
}

export const transfer = async (
  api: ApiPromise,
  receiver: string,
  amount: BigInt | number | string,
) => {
  // Transfer the tokens
  const transfer = await api.tx.balances.transferKeepAlive(receiver, amount)

  return transfer
}
