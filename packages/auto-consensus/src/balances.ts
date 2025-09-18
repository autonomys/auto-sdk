import { activate, activateDomain, Api, type DomainParams } from '@autonomys/auto-utils'
import { account } from './account'
import type { BalanceData } from './types/balance'

/**
 * Retrieves the total token issuance of the network.
 *
 * This function queries the blockchain to get the total amount of tokens that have been issued
 * across the entire network. This includes all tokens in circulation, staked, reserved, and frozen.
 *
 * @param networkId - Either a networkId string for consensus, or { networkId, domainId } to query a domain
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
 * // Query for specific network (consensus)
 * const chronosIssuance = await totalIssuance('chronos')
 *
 * // Query Auto-EVM domain on Chronos
 * const evmIssuance = await totalIssuance({ networkId: 'chronos', domainId: '0' })
 * ```
 */
export const totalIssuance = async (networkId?: string | DomainParams) => {
  // Determine whether to connect to consensus or a domain
  const isDomain = typeof networkId === 'object' && networkId !== null && 'domainId' in networkId
  const api = await (isDomain
    ? activateDomain(networkId)
    : activate(networkId ? { networkId } : undefined))

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
    console.log('error', error)
    throw new Error('Error getting balance' + error)
  }
}
