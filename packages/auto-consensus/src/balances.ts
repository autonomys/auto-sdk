import { activate, Api } from '@autonomys/auto-utils'
import { account } from './account'
import type { BalanceData } from './types/balance'

/**
 * Retrieves the total token issuance of the network.
 *
 * This function queries the blockchain to get the total amount of tokens that have been issued
 * across the entire network. This includes all tokens in circulation, staked, reserved, and frozen.
 *
 * @param networkId - Optional network identifier. If not provided, uses the default network
 * @returns Promise that resolves to a Codec containing the total issuance value as a hex string
 * @throws Error if the network connection fails or the query is unsuccessful
 *
 * @example
 * ```typescript
 * import { totalIssuance } from '@autonomys/auto-consensus'
 *
 * // Query total issuance for default network
 * const issuance = await totalIssuance()
 * const totalTokens = BigInt(issuance.toString())
 * console.log(`Total tokens issued: ${totalTokens}`)
 *
 * // Query for specific network
 * const taurusIssuance = await totalIssuance('taurus')
 * ```
 */
export const totalIssuance = async (networkId?: string) => {
  // Get the api instance for the network
  const api = await activate({ networkId })

  // Get the current total token issuance
  const totalIssuance = await api.query.balances.totalIssuance()

  return totalIssuance
}

/**
 * Retrieves the balance information for a specific account.
 *
 * This function queries the balance data for a given account address, returning information
 * about free, reserved, frozen, and flag balances. It uses the account function internally
 * to get comprehensive account data and extracts the balance portion.
 *
 * @param api - The connected API instance to query the blockchain
 * @param address - The account address to query balance information for
 * @returns Promise that resolves to BalanceData containing balance details
 * @throws Error if the account query fails or balance data cannot be retrieved
 *
 * @example
 * ```typescript
 * import { balance } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'gemini-3h' })
 * const balanceData = await balance(api, '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
 *
 * console.log(`Free Balance: ${balanceData.free}`)
 * console.log(`Reserved Balance: ${balanceData.reserved}`)
 * console.log(`Frozen Balance: ${balanceData.frozen}`)
 *
 * await api.disconnect()
 * ```
 */
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
