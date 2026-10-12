import { activate, activateDomain, Api, disconnect, type DomainParams } from '@autonomys/auto-utils'
import { account } from './account'
import type { BalanceData } from './types/balance'

/**
 * Retrieves the total token issuance of the network.
 *
 * This function queries the blockchain to get the total amount of tokens that have been issued
 * across the entire network. This includes all tokens in circulation, staked, reserved, and frozen.
 *
 * @param apiOrNetworkId - Either an active Api instance, a networkId string for consensus, or { networkId, domainId } to query a domain
 * @returns Promise that resolves to a Codec containing the total issuance value as a hex string
 * @throws Error if the network connection fails or the query is unsuccessful
 *
 * @example
 * ```typescript
 * import { totalIssuance } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * // Query using an existing connection
 * const api = await activate({ networkId: 'mainnet' })
 * const issuance = await totalIssuance(api)
 *
 * // Or query by networkId (automatically manages connection and disconnects)
 * const chronosIssuance = await totalIssuance('chronos')
 * ```
 */
export const totalIssuance = async (apiOrNetworkId?: Api | string | DomainParams) => {
  // If an active Api instance is provided, use it directly without creating or closing connection
  if (
    apiOrNetworkId &&
    typeof apiOrNetworkId === 'object' &&
    'query' in apiOrNetworkId &&
    typeof (apiOrNetworkId as Api).query?.balances?.totalIssuance === 'function'
  ) {
    return (apiOrNetworkId as Api).query.balances.totalIssuance()
  }

  // Determine whether to connect to consensus or a domain
  const isDomain =
    typeof apiOrNetworkId === 'object' && apiOrNetworkId !== null && 'domainId' in apiOrNetworkId
  const api = await (isDomain
    ? activateDomain(apiOrNetworkId as DomainParams)
    : activate(typeof apiOrNetworkId === 'string' ? { networkId: apiOrNetworkId } : undefined))

  try {
    const totalIssuance = await api.query.balances.totalIssuance()
    return totalIssuance
  } finally {
    try {
      await disconnect(api)
    } catch {
      // ignore disconnect errors
    }
  }
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
 * const api = await activate({ networkId: 'mainnet' })
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
    console.error('Error fetching balance:', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Error getting balance: ${errorMsg}`, { cause: error })
  }
}
