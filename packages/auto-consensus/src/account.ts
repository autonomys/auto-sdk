// file: src/account.ts

import type { Api } from '@autonomys/auto-utils'
import type { AccountData, RawAccountData } from './types/account'
import { parseBalance, parseBN } from './utils'

export const account = async (api: Api, address: string): Promise<AccountData> => {
  try {
    const rawAccount = await api.query.system.account(address)

    const { nonce, data } = rawAccount.toPrimitive() as unknown as RawAccountData

    return {
      nonce: parseBN(nonce),
      data: parseBalance(data),
    }
  } catch (error) {
    console.log('error', error)
    throw new Error('Error getting account' + error)
  }
}
