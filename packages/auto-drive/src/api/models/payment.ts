/**
 * Current storage price, returned by `getStoragePrice`.
 * This is a live read of the on-chain byte fee — no API key required.
 * Use it to display a cost estimate before creating a price-locked intent.
 */
export type StoragePrice = {
  /** Current price per byte in shannons */
  shannonsPerByte: number
  /** Pre-computed display price in AI3 per gigabyte */
  ai3PerGb: number
}

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
  'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'EXPIRED' | 'FAILED' | 'OVER_CAP'

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
  /**
   * How long to keep polling through HTTP 410 before returning `'EXPIRED'`.
   *
   * Auto Drive answers `GET /intents/:id` with 410 once the price lock has
   * lapsed on an intent that has no recorded transaction hash, for example
   * when `watchPaymentTransaction` itself got a 410. (With a recorded hash,
   * the 410 starts only when Auto Drive stops accepting payments for the
   * intent, currently 20 minutes after `expiresAt`.) A payment sent near the
   * end of the lock can still be credited after the first 410.
   *
   * When this option is set, a 410 does not end the wait: polling continues
   * until the 410 has persisted for this many milliseconds, and only then
   * resolves to `'EXPIRED'`. A successful read in between resets the clock.
   * With `0`, the first 410 resolves to `'EXPIRED'`.
   *
   * `'EXPIRED'` from this path means that the SDK stopped waiting. It does not
   * prove that the payment is lost: Auto Drive can still credit a payment until
   * it stops accepting payments for the intent. Check the account's credits
   * before you tell a user that the payment failed.
   *
   * The grace is measured from the first 410 that the SDK sees. Wait for the
   * payment transaction to be mined before you call `waitForPaymentCompletion`,
   * so that block time does not use up the grace. Keep `timeoutMs` larger than
   * the time left on the lock plus this grace, or the call can throw a timeout
   * error before it returns `'EXPIRED'`.
   *
   * For USDC, pass `UsdcPaymentIntent.settleGraceMs` (served by the backend).
   * When omitted, a 410 throws a {@link PaymentApiError}, as in earlier versions.
   * Must be a non-negative finite number.
   */
  settleGraceMs?: number
}

/** The asset an intent is paid in, as Auto Drive names it on the wire. */
export type PaymentMethod = 'ai3_native' | 'usdc_eth'

/**
 * Where a USDC payment is sent, as the Auto Drive deployment reports it.
 * Returned by `getUsdcPaymentTarget`. Use these values as they are: do not
 * hardcode the chain, the receiver or the token.
 */
export type UsdcPaymentTarget = {
  /** EIP-155 chain ID the receiver is deployed on. Switch the wallet to this chain before signing. */
  chainId: number
  /** `AutoDriveUSDCReceiver` address. Call `payIntentWithToken` here; it is also the `approve` spender. */
  receiverAddress: string
  /** Address of the ERC-20 token the receiver accepts (USDC). Call `approve` on this. */
  tokenAddress: string
  /** Decimals of the token (6 for USDC). Use this, not the token contract, to format amounts. */
  tokenDecimals: number
  /** Block confirmations the backend waits for before it credits a payment */
  confirmations: number
  /** How long a lapsed price lock may keep answering HTTP 410 before the purchase should be treated as expired, in milliseconds */
  settleGraceMs: number
}

/**
 * A price-locked USDC payment intent returned by `createUsdcPaymentIntent`.
 *
 * The quote is valid until `expiresAt` (10 minutes by default). Approve `usdcAmount` to
 * `receiverAddress` on `tokenAddress`, then call
 * `payIntentWithToken(intentId, usdcAmount)` on `receiverAddress`, on `chainId`.
 */
export type UsdcPaymentIntent = {
  /** Unique intent identifier: pass as the `bytes32` arg to `payIntentWithToken()` */
  intentId: string
  /** Always `'usdc_eth'` */
  paymentMethod: 'usdc_eth'
  /** Exact amount to pay, in token base units (6 decimals for USDC), as a decimal string (safe for BigInt conversion) */
  usdcAmount: string
  /** Human-readable amount built from `tokenDecimals`, e.g. "2.5" */
  usdcAmountFormatted: string
  /** `AutoDriveUSDCReceiver` address (copy from `UsdcPaymentTarget`) */
  receiverAddress: string
  /** ERC-20 token address (copy from `UsdcPaymentTarget`) */
  tokenAddress: string
  /** EIP-155 chain ID to pay on (copy from `UsdcPaymentTarget`) */
  chainId: number
  /** Token decimals (copy from `UsdcPaymentTarget`) */
  tokenDecimals: number
  /** Block confirmations the backend waits for (copy from `UsdcPaymentTarget`) */
  confirmations: number
  /** Pass to `waitForPaymentCompletion` as `settleGraceMs` (copy from `UsdcPaymentTarget`) */
  settleGraceMs: number
  /** ISO 8601 timestamp when the price lock ends */
  expiresAt: string
  /** Locked price per byte in shannons, as a decimal string */
  shannonsPerByte: string
  /** AI3 amount, in shannons, that `usdcAmount` was quoted for, as a decimal string */
  quotedAi3Shannons: string
  /** AI3/USD rate at creation, scaled by 1e18, as a decimal string. For reporting only: it does not include the quote margin. */
  usdRateAtCreation: string
}

/**
 * The account's purchased storage credits, returned by `getCreditSummary`.
 *
 * Covers only credits bought with a payment intent. The free allocation is
 * reported separately by `getPendingCredits`. Byte amounts are decimal strings
 * (safe for BigInt conversion), as Auto Drive sends them.
 */
export type CreditSummary = {
  /** Upload bytes left across all active (non-expired) purchases */
  uploadBytesRemaining: string
  /** Upload bytes originally bought across all active (non-expired) purchases */
  totalPurchasedBytesOriginal: string
  /** Download bytes left across all active (non-expired) purchases */
  downloadBytesRemaining: string
  /** ISO 8601 timestamp of the soonest expiry among active purchases, or `null` when there are none */
  nextExpiryDate: string | null
  /** Number of active (non-expired) purchases */
  batchCount: number
  /** Whether the account can buy more credits without exceeding the per-user credit cap */
  canPurchase: boolean
  /** Largest `sizeBytes` a new intent can request right now without a `CREDIT_CAP_EXCEEDED` error, as a decimal string */
  maxPurchasableBytes: string
  /** Whether the account is registered with Google, which Auto Drive requires to buy credits */
  googleVerified: boolean
  /** Number of days after purchase that credits expire */
  expiryDays: number
}

/**
 * One credit purchase, returned by `getCreditBatches` and `getExpiringCreditBatches`.
 *
 * Each completed payment intent creates one batch. Uploads use the credits of
 * the batch that expires soonest first. Byte amounts are decimal strings
 * (safe for BigInt conversion) and timestamps are ISO 8601 strings.
 */
export type CreditBatch = {
  /** Unique batch identifier */
  id: string
  /** Auto Drive account the credits belong to */
  accountId: string
  /** Payment intent that bought this batch */
  intentId: string
  /** Upload bytes bought */
  uploadBytesOriginal: string
  /** Upload bytes not used yet */
  uploadBytesRemaining: string
  /** Download bytes bought */
  downloadBytesOriginal: string
  /** Download bytes not used yet */
  downloadBytesRemaining: string
  /** ISO 8601 timestamp of the purchase */
  purchasedAt: string
  /** ISO 8601 timestamp when the remaining credits expire */
  expiresAt: string
  /** Whether Auto Drive has marked the batch as expired with credits left unused */
  expired: boolean
  /** ISO 8601 timestamp of the refund, or `null` if the batch was not refunded. A refund sets the remaining bytes to zero. */
  refundedAt: string | null
  /** Hash of the AI3 refund transaction, or `null` if not refunded (or refunded before Auto Drive recorded it) */
  refundTxHash: string | null
  /** ISO 8601 timestamp when the batch was created */
  createdAt: string
  /** ISO 8601 timestamp of the last change to the batch */
  updatedAt: string
}

/**
 * Machine-readable error codes that Auto Drive returns for payment requests.
 *
 * - `GOOGLE_ACCOUNT_REQUIRED` (403): buying credits needs a Google-verified account.
 *   Usually such accounts get a 404 with no code instead, because Auto Drive
 *   hides the `/intents` routes from accounts that cannot buy credits.
 * - `CREDIT_CAP_EXCEEDED` (403): the purchase would exceed the per-user credit cap. Try a smaller size.
 * - `USDC_PAYMENTS_DISABLED` (403): USDC is not available to this account or deployment. Pay with AI3.
 * - `USDC_PAYMENTS_UNAVAILABLE` (503): USDC is closed for now (admin switch, treasury cap,
 *   unknown treasury balance or price oracle). Pay with AI3, or try again later.
 * - `PRICE_ORACLE_UNAVAILABLE` (503): no trusted AI3/USD rate. Retry unchanged.
 * - `PRICE_UNSTABLE` (503): the market moved too fast to quote. Retry unchanged.
 *
 * Other failures have no code. Examples: 400 when `requestedBytes` is invalid or
 * larger than the whole credit cap, 404 when the account cannot buy credits,
 * 410 when the price lock has lapsed.
 */
export type PaymentErrorCode =
  | 'GOOGLE_ACCOUNT_REQUIRED'
  | 'CREDIT_CAP_EXCEEDED'
  | 'USDC_PAYMENTS_DISABLED'
  | 'USDC_PAYMENTS_UNAVAILABLE'
  | 'PRICE_ORACLE_UNAVAILABLE'
  | 'PRICE_UNSTABLE'

/**
 * Thrown by the authenticated payment calls when Auto Drive answers with a
 * non-OK status. `status` is the HTTP status. `code` is set when the backend
 * sends a machine-readable `{ error: <CODE>, message }` body; see
 * {@link PaymentErrorCode}. Branch on `code`, not on `message`.
 */
export class PaymentApiError extends Error {
  readonly status: number
  // `string & {}` keeps editor completion for the known codes while still
  // accepting codes a newer backend may add.
  readonly code?: PaymentErrorCode | (string & {})

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'PaymentApiError'
    this.status = status
    this.code = code
  }
}

/**
 * Thrown when Auto Drive refuses an intent because the requested size would
 * exceed the user's per-user credit cap (HTTP 403, code `CREDIT_CAP_EXCEEDED`).
 * Nothing has been paid at this point. Retry with a smaller size.
 *
 * A {@link PaymentApiError}, so `status` and `code` are set as for any other
 * payment error.
 */
export class CreditCapExceededError extends PaymentApiError {
  declare readonly code: 'CREDIT_CAP_EXCEEDED'

  constructor(message: string, status = 403) {
    super(message, status, 'CREDIT_CAP_EXCEEDED')
    this.name = 'CreditCapExceededError'
  }
}

/**
 * Minimal ABI for `payIntentWithToken(bytes32 intentId, uint256 amount)` on
 * `AutoDriveUSDCReceiver`. The call is not payable: the receiver pulls the
 * tokens with `transferFrom`, so approve it first.
 */
export const usdcReceiverAbi = [
  {
    type: 'function',
    name: 'payIntentWithToken',
    inputs: [
      { name: 'intentId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * Minimal ERC-20 ABI for the USDC payment flow: `approve`, `allowance` and
 * `balanceOf`. `transfer` and `transferFrom` are left out on purpose, because
 * the receiver pulls the tokens itself and the payer never sends them directly.
 * `decimals` is left out too: use `UsdcPaymentTarget.tokenDecimals`.
 */
export const erc20ApprovalAbi = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const
