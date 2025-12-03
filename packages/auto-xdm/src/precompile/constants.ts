/**
 * Transporter Precompile Constants
 *
 * The Transporter Precompile is deployed at address 0x0800 (2048) on all Auto-EVM domains.
 * It enables EVM users to transfer funds to the consensus chain without using Substrate RPCs.
 *
 * @see https://github.com/autonomys/subspace/pull/3714
 */

/**
 * Transporter precompile address (0x0800 = 2048 in decimal)
 * This address is the same on all Auto-EVM domains (mainnet, testnet, local dev).
 */
export const TRANSPORTER_PRECOMPILE_ADDRESS = '0x0000000000000000000000000000000000000800'
