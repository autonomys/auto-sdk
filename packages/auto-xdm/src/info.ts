// file: src/types/index.ts

import { query } from '@autonomys/auto-consensus'
import { createDomainsChainIdType, type ApiPromise, type Codec } from '@autonomys/auto-utils'

/**
 * Query the chain allowlist for the current chain.
 *
 * Returns the allowlist of chains that can open channels with this chain.
 * This is used to control which chains are allowed to establish communication channels.
 *
 * @param api - The API promise instance for the chain
 * @returns The set of allowed chain IDs
 */
export const chainAllowlist = async (api: ApiPromise) =>
  await query<Codec>(api, 'messenger.chainAllowlist', [])

/**
 * Query channels for a specific chain ID.
 *
 * Returns the channel configuration between the current chain and the specified chain.
 * Channels represent bridges for exchanging cross-domain messages between two chains.
 *
 * @param api - The API promise instance for the chain
 * @param chainId - The chain ID to query channels for
 * @returns Channel configuration for the specified chain
 */
export const channels = async (api: ApiPromise, chainId: Codec) =>
  await query<Codec>(api, 'messenger.channels', [chainId])

/**
 * Query channels from the consensus chain.
 *
 * Returns all channels from the consensus chain to other chains (consensus or domains).
 * This is a convenience method that automatically uses the consensus chain ID.
 *
 * @param api - The API promise instance for the consensus chain
 * @returns Channel configurations from the consensus chain
 */
export const consensusChannels = async (api: ApiPromise) =>
  await query<Codec>(api, 'messenger.channels', [createDomainsChainIdType(api)])

/**
 * Query channels from a specific domain.
 *
 * Returns all channels from the specified domain to other chains.
 * This allows domains to communicate with the consensus chain and other domains.
 *
 * @param api - The API promise instance for the domain
 * @param domainId - The domain ID to query channels for
 * @returns Channel configurations from the specified domain
 */
export const domainChannels = async (api: ApiPromise, domainId: number) =>
  await query<Codec>(api, 'messenger.channels', [createDomainsChainIdType(api, domainId)])

export const allCancelledTransfers = async (api: ApiPromise) => {
  return await query<Codec>(api, 'transporter.cancelledTransfers', [])
}

export const chainTransfers = async (api: ApiPromise) => {
  return await query<Codec>(api, 'transporter.chainTransfers', [])
}

/**
 * Query all domain balances on the consensus chain.
 *
 * Returns the balances for all domains tracked on the consensus chain.
 * Domain balances represent the amount of funds available on each domain
 * for processing transfers and other operations.
 *
 * @param api - The API promise instance for the consensus chain
 * @returns All domain balances indexed by domain ID
 */
export const allDomainBalances = async (api: ApiPromise) => {
  return await query<Codec>(api, 'transporter.domainBalances', [])
}

/**
 * Query the balance for a specific domain.
 *
 * Returns the balance for the specified domain on the consensus chain.
 * Domain balances represent the amount of funds available on the domain
 * for processing transfers and other operations.
 *
 * @param api - The API promise instance for the consensus chain
 * @param domainId - The domain ID to query balance for
 * @returns The balance for the specified domain
 */
export const domainBalances = async (api: ApiPromise, domainId: number) => {
  return await query<Codec>(api, 'transporter.domainBalances', [domainId])
}

export const allUnconfirmedTransfers = async (api: ApiPromise) => {
  return await query<Codec>(api, 'transporter.unconfirmedTransfers', [])
}
