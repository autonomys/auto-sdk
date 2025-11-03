/**
 * Chain identifier for queries and transfers.
 *
 * Use the string literal 'consensus' for the consensus chain,
 * or an object with domainId for a specific domain.
 *
 * @example
 * ```typescript
 * // Consensus chain
 * const consensus: Chain = 'consensus'
 *
 * // Domain chain (e.g., domain 1)
 * const domain: Chain = { domainId: 1 }
 * ```
 */
export type Chain = 'consensus' | { domainId: number }

/**
 * Account identifier for transfers.
 * Provide either accountId32 (for Substrate/SS58 addresses) or accountId20 (for EVM addresses).
 *
 * @example
 * ```typescript
 * // Substrate/SS58 address
 * const substrateAccount: TransferAccount = { accountId32: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' }
 *
 * // EVM address
 * const evmAccount: TransferAccount = { accountId20: '0x1234567890abcdef1234567890abcdef12345678' }
 * ```
 */
export type TransferAccount = { accountId32: string } | { accountId20: string }
