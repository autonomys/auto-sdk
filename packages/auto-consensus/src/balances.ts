import { activate, Api } from '@autonomys/auto-utils'
import { account } from './account'
import type { BalanceData } from './types/balance'

export const totalIssuance = async (networkId?: string) => {
  // Get the api instance for the network
  const api = await activate({ networkId })

  // Get the current total token issuance
  const totalIssuance = await api.query.balances.totalIssuance()

  return totalIssuance
}

export const balance = async (api: Api, address: string): Promise<BalanceData> => {
  // Query the balance of the address and parse the data
  try {
    const rawAccount = await account(api, address)

    const { data } = rawAccount as { data: BalanceData }

    return data
  } catch (error) {
    console.log('error', error)
    throw new Error('Error getting balance' + error)
  }
}
