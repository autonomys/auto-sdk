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

/**
 * Chain IDs for Auto-EVM networks
 */
export const AUTO_EVM_CHAIN_IDS = {
  /** Auto-EVM Mainnet */
  mainnet: 490000,
  /** Auto-EVM Taurus Testnet */
  taurus: 490000,
  /** Auto-EVM local dev node */
  local: 490000,
} as const

/**
 * Domain IDs
 */
export const DOMAIN_IDS = {
  /** Auto-EVM domain on mainnet */
  autoEvmMainnet: 0,
  /** Auto-EVM domain on Chronos testnet */
  autoEvmChronos: 0,
} as const
