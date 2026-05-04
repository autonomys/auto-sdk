/**
 * Information about the EVM smart contract used to pay for storage intents.
 * Returned by the public `/intents/contract` endpoint — no API key required.
 */
export type PaymentContractInfo = {
  /** Auto EVM chain ID (870 for mainnet) */
  chainId: number
  /** Address of the Credits Receiver contract */
  contractAddress: string
  /** ABI fragment for the payIntent(bytes32) function */
  payIntentAbi: readonly unknown[]
}

/**
 * A price-locked payment intent returned by `createPaymentIntent`.
 * The intent expires after 10 minutes. Send exactly `ai3AmountWei` to
 * the Credits Receiver contract via `payIntent(intentId)`.
 */
export type PaymentIntent = {
  /** Unique intent identifier — pass as the `bytes32` arg to `payIntent()` */
  intentId: string
  /** Amount to send, in shannons/wei, as a decimal string (safe for BigInt conversion) */
  ai3AmountWei: string
  /** Human-readable amount, e.g. "0.00123" */
  ai3Amount: string
  /** The Credits Receiver contract address (convenience copy from PaymentContractInfo) */
  contractAddress: string
  /** Current price per byte in shannons */
  shannonsPerByte: string
  /** ISO 8601 timestamp when this intent expires */
  expiresAt: string
}

/** All possible states a payment intent can be in */
export type PaymentIntentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'FAILED'
  | 'OVER_CAP'

/** States that indicate the intent lifecycle has ended */
export type PaymentIntentTerminalStatus = Extract<
  PaymentIntentStatus,
  'COMPLETED' | 'EXPIRED' | 'FAILED' | 'OVER_CAP'
>

/** Options for `waitForPaymentCompletion` */
export type PollOptions = {
  /** How often to check intent status. Default: 3 000 ms */
  pollIntervalMs?: number
  /** Maximum time to wait before throwing. Default: 300 000 ms (5 minutes) */
  timeoutMs?: number
}
