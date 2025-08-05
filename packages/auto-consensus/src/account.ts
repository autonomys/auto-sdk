// file: src/account.ts

import type { Api } from '@autonomys/auto-utils'
import type { AccountData, RawAccountData } from './types/account'
import { parseBalance, parseBN } from './utils'

/**
 * Retrieves detailed account information including nonce and balance data.
 *
 * This function queries the system account storage to get comprehensive account information
 * including the account nonce (transaction counter) and balance details (free, reserved, frozen, flags).
 *
 * @param api - The connected API instance to query the blockchain
 * @param address - The account address to query information for
 * @returns Promise that resolves to AccountData containing nonce and balance information
 * @throws Error if the account query fails or if there's an issue parsing the data
 *
 * @example
 * ```typescript
 * import { account } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const accountData = await account(api, '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
 *
 * console.log(`Nonce: ${accountData.nonce}`)
 * console.log(`Free Balance: ${accountData.data.free}`)
 * console.log(`Reserved Balance: ${accountData.data.reserved}`)
 *
 * await api.disconnect()
 * ```
 */
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
