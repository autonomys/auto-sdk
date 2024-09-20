// file: src/balances.ts

import type { Api } from '@autonomys/auto-utils'
import type { AccountData } from './types/account'

export const account = async (api: Api, address: string): Promise<AccountData> => {
  // Query the balance of the address and parse the data
  try {
    const rawAccount = await api.query.system.account(address)

    const { nonce, data } = rawAccount.toPrimitive() as unknown as AccountData

    return {
      nonce,
      data,
    }
  } catch (error) {
    console.log('error', error)
    throw new Error('Error getting account' + error)
  }
}
