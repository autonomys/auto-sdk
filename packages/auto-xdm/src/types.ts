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

/**
 * Chain ID enum variant representing either the consensus chain or a domain chain.
 *
 * This matches the Rust `ChainId` enum. When serialized to JSON by Polkadot.js,
 * the keys are lowercase (`consensus`, `domain`), matching the JSON representation.
 *
 * Note: When creating ChainId types programmatically (e.g., with `createDomainsChainIdType`),
 * use PascalCase keys (`{ Consensus: null }` or `{ Domain: number }`).
 *
 * @example
 * ```typescript
 * // Consensus chain ID (JSON representation)
 * const consensusId: ChainId = { consensus: null }
 *
 * // Domain chain ID (JSON representation, e.g., domain 0)
 * const domainId: ChainId = { domain: 0 }
 *
 * // When creating types programmatically, use PascalCase:
 * const consensusCodec = createDomainsChainIdType(api) // { Consensus: null }
 * const domainCodec = createDomainsChainIdType(api, 0) // { Domain: 0 }
 * ```
 */
export type ChainId = { consensus: null } | { domain: number }

/**
 * Chain allowlist return type.
 *
 * Represents a BTreeSet of ChainId values that can open channels with the current chain.
 * Converted to the friendlier Chain type for easier use.
 *
 * @example
 * ```typescript
 * const allowlist = await chainAllowlist(api)
 * // allowlist: ['consensus'] or [{ domainId: 0 }, { domainId: 1 }]
 * ```
 */
export type ChainAllowlist = Chain[]
