import type { StringNumberOrBigInt } from '@autonomys/auto-consensus'
import {
  ApiPromise,
  createAccountId20Type,
  createAccountId32Type,
  createDomainsChainIdType,
  createMultiAccountIdType,
  createTransporterLocationType,
  type ISubmittableResult,
  type SubmittableExtrinsic,
} from '@autonomys/auto-utils'
import type { Chain, TransferAccount } from './types'

/**
 * Creates a transfer transaction to be submitted.
 *
 * This function creates a transaction but does not submit it. The returned transaction
 * must be signed and sent using `signAndSendTx` or similar methods.
 *
 * @param api - The API instance for the source chain
 * @param destination - The destination chain: 'consensus' or { domainId: number }
 * @param account - The destination account: { accountId32: string } for Substrate addresses or { accountId20: string } for EVM addresses
 * @param amount - The amount to transfer (as string, number, or bigint)
 * @returns A transaction that can be signed and submitted
 *
 * @example
 * ```typescript
 * // Transfer to consensus chain with Substrate address
 * const tx = transfer(api, 'consensus', { accountId32: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' }, '1000000000000000000')
 *
 * // Transfer to domain 0 with EVM address
 * const tx = transfer(api, { domainId: 0 }, { accountId20: '0x1234567890abcdef1234567890abcdef12345678' }, '1000000000000000000')
 *
 * // Transfer to domain 1 with Substrate address
 * const tx = transfer(api, { domainId: 1 }, { accountId32: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' }, '1000000000000000000')
 * ```
 */
export const transporterTransfer = (
  api: ApiPromise,
  destination: Chain,
  account: TransferAccount,
  amount: StringNumberOrBigInt,
): SubmittableExtrinsic<'promise', ISubmittableResult> => {
  // Create chain ID codec
  const chainId =
    destination === 'consensus'
      ? createDomainsChainIdType(api)
      : createDomainsChainIdType(api, destination.domainId)

  // Create account ID codec based on account type
  const accountId =
    'accountId32' in account
      ? createMultiAccountIdType(api, {
          accountId32: createAccountId32Type(api, account.accountId32),
        })
      : createMultiAccountIdType(api, {
          accountId20: createAccountId20Type(api, account.accountId20),
        })

  // Create location type
  const location = createTransporterLocationType(api, chainId, accountId)

  // Return transaction
  return api.tx.transporter.transfer(location, amount)
}
