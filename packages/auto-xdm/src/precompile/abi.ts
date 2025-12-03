/**
 * Transporter Precompile ABI
 *
 * The precompile exposes two functions:
 * - minimum_transfer_amount(): Returns the minimum amount that can be transferred
 * - transfer_to_consensus_v1(bytes32, uint256): Transfers funds to a consensus chain account
 *
 * @see https://github.com/autonomys/subspace/pull/3714
 */

/**
 * ABI for the Transporter Precompile contract
 */
export const TRANSPORTER_PRECOMPILE_ABI = [
  {
    name: 'minimum_transfer_amount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer_to_consensus_v1',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'accountId32', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

/**
 * Function selectors (first 4 bytes of keccak256 hash of function signature)
 * Useful for low-level calls or transaction decoding
 */
export const TRANSPORTER_FUNCTION_SELECTORS = {
  /** minimum_transfer_amount() */
  minimumTransferAmount: '0x48a65e68',
  /** transfer_to_consensus_v1(bytes32,uint256) */
  transferToConsensusV1: '0xedcd6515',
} as const
