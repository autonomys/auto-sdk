import { formatUnits, shannonsToAi3 } from '@autonomys/auto-utils'
import {
  CreditCapExceededError,
  PaymentApiError,
  PaymentContractInfo,
  PaymentIntent,
  PaymentIntentStatus,
  PaymentIntentTerminalStatus,
  PollOptions,
  StoragePrice,
  UsdcPaymentIntent,
  UsdcPaymentTarget,
} from '../models/payment'
import { AutoDriveApiHandler } from '../types'

const TERMINAL_STATUSES: PaymentIntentTerminalStatus[] = [
  'COMPLETED',
  'EXPIRED',
  'FAILED',
  'OVER_CAP',
]

/**
 * Builds a {@link PaymentApiError} from a non-OK response. Auto Drive sends
 * `{ error: <CODE>, message }` for coded errors and `{ error: <message> }` for
 * uncoded ones; anything else (including non-JSON) is used as-is.
 */
const toPaymentApiError = async (response: Response, context: string) => {
  const body = await response.text()
  let code: string | undefined
  let message = body
  try {
    const parsed: unknown = JSON.parse(body)
    if (parsed && typeof parsed === 'object') {
      const { error, message: parsedMessage } = parsed as { error?: unknown; message?: unknown }
      if (typeof parsedMessage === 'string') {
        code = typeof error === 'string' ? error : undefined
        message = parsedMessage
      } else if (typeof error === 'string') {
        message = error
      }
    }
  } catch {
    // Not JSON: keep the raw body
  }
  const fullMessage = `${context}: ${response.status} ${message}`
  if (code === 'CREDIT_CAP_EXCEEDED') {
    return new CreditCapExceededError(fullMessage, response.status)
  }
  return new PaymentApiError(fullMessage, response.status, code)
}

/**
 * Returns `sizeBytes` as the decimal string the `/intents` endpoint expects.
 * Throws a TypeError unless it is a positive whole number of bytes.
 */
const toRequestedBytes = (sizeBytes: number | bigint): string => {
  const valid =
    typeof sizeBytes === 'bigint'
      ? sizeBytes > BigInt(0)
      : Number.isSafeInteger(sizeBytes) && sizeBytes > 0
  if (!valid) {
    throw new TypeError(
      `sizeBytes must be a positive whole number of bytes, received: ${sizeBytes}`,
    )
  }
  return sizeBytes.toString()
}

const createIntent = (api: AutoDriveApiHandler, body: Record<string, string>) =>
  api.sendAPIRequest(
    '/intents',
    { method: 'POST', headers: new Headers({ 'Content-Type': 'application/json' }) },
    JSON.stringify(body),
  )

/**
 * Returns the current live storage price without creating a price-locked intent.
 *
 * This is a public endpoint — no API key is required.
 * Use it to show a cost estimate to users before they commit to a payment.
 *
 * @returns `shannonsPerByte` — the raw on-chain price, and `ai3PerGb` — a
 *   pre-computed display value in AI3 per gigabyte.
 */
export const getStoragePrice = async (api: AutoDriveApiHandler): Promise<StoragePrice> => {
  const response = await api.sendAPIRequest('/intents/price', { method: 'GET' })

  if (!response.ok) {
    throw new Error(`Failed to fetch storage price: ${response.status} ${response.statusText}`)
  }

  const { price, pricePerGB } = await response.json()
  return { shannonsPerByte: price, ai3PerGb: pricePerGB }
}

/**
 * Fetches the EVM chain ID, contract address, and ABI needed to call `payIntent(bytes32)`.
 *
 * This is a public endpoint — no API key is required. The result is stable
 * per network and safe to cache for the lifetime of the application.
 */
export const getPaymentContractInfo = async (
  api: AutoDriveApiHandler,
): Promise<PaymentContractInfo> => {
  const response = await api.sendAPIRequest('/intents/contract', { method: 'GET' })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch payment contract info: ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}

/**
 * Creates a price-locked payment intent for a given upload size in bytes.
 *
 * The intent locks the current `shannonsPerByte` price for 10 minutes.
 * The returned `ai3AmountWei` is the exact value to pass as `msg.value`
 * when calling `payIntent(intentId)` on the Credits Receiver contract.
 *
 * `sizeBytes` is sent to Auto Drive as `requestedBytes`, so the server can
 * check it against the user's credit cap before any payment is made. If the
 * purchase would exceed the cap, this throws a {@link CreditCapExceededError}
 * and nothing should be paid. A single purchase larger than the whole cap is
 * rejected with a {@link PaymentApiError} with HTTP 400 and no `code`. The SDK
 * multiplies the returned `shannonsPerByte` rate by `sizeBytes` to produce
 * `ai3AmountWei`.
 *
 * Flow:
 * 1. Call `createPaymentIntent(api, sizeBytes)` — locks the price
 * 2. Send `intent.ai3AmountWei` to `intent.contractAddress` via `payIntent(intent.intentId)`
 * 3. Call `watchPaymentTransaction(api, intent.intentId, txHash)` — submit the tx hash
 * 4. Call `waitForPaymentCompletion(api, intent.intentId)` — poll until COMPLETED
 */
export const createPaymentIntent = async (
  api: AutoDriveApiHandler,
  sizeBytes: number,
): Promise<PaymentIntent> => {
  const body = { requestedBytes: toRequestedBytes(sizeBytes) }

  const [contractInfo, intentRes] = await Promise.all([
    getPaymentContractInfo(api),
    createIntent(api, body),
  ])

  if (!intentRes.ok) {
    throw await toPaymentApiError(intentRes, 'Failed to create payment intent')
  }

  const intent = await intentRes.json()
  const shannonsPerByte = BigInt(intent.shannonsPerByte)
  const ai3AmountWei = shannonsPerByte * BigInt(sizeBytes)

  return {
    intentId: intent.id,
    ai3AmountWei: ai3AmountWei.toString(),
    ai3Amount: shannonsToAi3(ai3AmountWei),
    contractAddress: contractInfo.contractAddress,
    shannonsPerByte: intent.shannonsPerByte,
    expiresAt: intent.expiresAt,
  }
}

/**
 * Returns where a USDC payment must be sent: chain ID, receiver contract, token
 * address and decimals, plus the backend's confirmation count and 410 grace.
 *
 * Requires an API key. Throws a {@link PaymentApiError} with code
 * `'USDC_PAYMENTS_DISABLED'` when this deployment does not accept USDC.
 */
export const getUsdcPaymentTarget = async (
  api: AutoDriveApiHandler,
): Promise<UsdcPaymentTarget> => {
  const response = await api.sendAPIRequest('/payments/usdc/target', { method: 'GET' })

  if (!response.ok) {
    throw await toPaymentApiError(response, 'Failed to fetch USDC payment target')
  }

  const target = await response.json()
  return {
    chainId: target.chainId,
    receiverAddress: target.receiverAddress,
    tokenAddress: target.tokenAddress,
    tokenDecimals: target.tokenDecimals,
    confirmations: target.confirmations,
    settleGraceMs: target.settleGraceMs,
  }
}

/**
 * Creates a price-locked USDC payment intent for a given purchase size in bytes.
 *
 * The intent locks a USDC amount until `intent.expiresAt` (10 minutes by
 * default). `usdcAmount` is the exact amount to approve and pay, in token base units.
 *
 * Flow:
 * 1. Call `createUsdcPaymentIntent(api, sizeBytes)`: locks the price
 * 2. On `intent.chainId`, call `approve(intent.receiverAddress, intent.usdcAmount)` on `intent.tokenAddress`
 * 3. Call `payIntentWithToken(intent.intentId, intent.usdcAmount)` on `intent.receiverAddress`
 * 4. Call `watchPaymentTransaction(api, intent.intentId, txHash)` with the hash of step 3, not step 2,
 *    as soon as you have it, then wait for the transaction to be mined
 * 5. Call `waitForPaymentCompletion(api, intent.intentId, { settleGraceMs: intent.settleGraceMs })`
 *
 * @param sizeBytes - Purchase size in bytes: a positive safe integer or a bigint.
 *   Sent as `requestedBytes`; the USDC amount is quoted for this size.
 * @throws {PaymentApiError} With `code` set to `CREDIT_CAP_EXCEEDED`,
 *   `GOOGLE_ACCOUNT_REQUIRED`, `USDC_PAYMENTS_DISABLED`, `USDC_PAYMENTS_UNAVAILABLE`,
 *   `PRICE_ORACLE_UNAVAILABLE` or `PRICE_UNSTABLE` when Auto Drive refuses the quote.
 *   A 404 with no `code` means that the account cannot buy credits.
 * @throws {TypeError} If `sizeBytes` is not a positive whole number.
 */
export const createUsdcPaymentIntent = async (
  api: AutoDriveApiHandler,
  sizeBytes: number | bigint,
): Promise<UsdcPaymentIntent> => {
  const requestedBytes = toRequestedBytes(sizeBytes)

  const [target, intentRes] = await Promise.all([
    getUsdcPaymentTarget(api),
    createIntent(api, { paymentMethod: 'usdc_eth', requestedBytes }),
  ])

  if (!intentRes.ok) {
    throw await toPaymentApiError(intentRes, 'Failed to create USDC payment intent')
  }

  const intent = await intentRes.json()
  if (typeof intent.quotedTokenAmount !== 'string') {
    throw new Error(`Auto Drive returned no USDC quote for intent "${intent.id}"`)
  }

  return {
    intentId: intent.id,
    paymentMethod: 'usdc_eth',
    usdcAmount: intent.quotedTokenAmount,
    usdcAmountFormatted: formatUnits(intent.quotedTokenAmount, target.tokenDecimals),
    receiverAddress: target.receiverAddress,
    tokenAddress: target.tokenAddress,
    chainId: target.chainId,
    tokenDecimals: target.tokenDecimals,
    confirmations: target.confirmations,
    settleGraceMs: target.settleGraceMs,
    expiresAt: intent.expiresAt,
    shannonsPerByte: intent.shannonsPerByte,
    quotedAi3Shannons: intent.quotedAi3Shannons,
    usdRateAtCreation: intent.usdRateAtCreation,
  }
}

/**
 * Notifies Auto Drive that an on-chain transaction has been submitted for a payment intent.
 *
 * Auto Drive will watch the transaction on-chain and automatically apply storage
 * credits to your account once the transaction is confirmed.
 *
 * Use the same call for AI3 and USDC. For USDC, pass the hash of the
 * `payIntentWithToken` transaction, not the `approve` transaction. A 410 here
 * means the price lock has lapsed; a USDC payment can still settle, so continue
 * with `waitForPaymentCompletion` and `settleGraceMs`.
 */
export const watchPaymentTransaction = async (
  api: AutoDriveApiHandler,
  intentId: string,
  txHash: string,
): Promise<void> => {
  const response = await api.sendAPIRequest(
    `/intents/${intentId}/watch`,
    {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
    },
    JSON.stringify({ txHash }),
  )

  if (!response.ok) {
    throw await toPaymentApiError(response, 'Failed to watch payment transaction')
  }
}

/**
 * Returns the current status of a payment intent.
 *
 * Possible statuses: PENDING | CONFIRMED | COMPLETED | EXPIRED | FAILED | OVER_CAP
 */
export const getPaymentIntentStatus = async (
  api: AutoDriveApiHandler,
  intentId: string,
): Promise<{ id: string; status: PaymentIntentStatus }> => {
  const response = await api.sendAPIRequest(`/intents/${intentId}`, { method: 'GET' })

  if (!response.ok) {
    throw await toPaymentApiError(response, 'Failed to get payment intent status')
  }

  const data = await response.json()
  return { id: data.id, status: data.status.toUpperCase() as PaymentIntentStatus }
}

/**
 * Polls a payment intent at regular intervals until it reaches a terminal state.
 *
 * Returns the terminal status: COMPLETED | EXPIRED | FAILED | OVER_CAP.
 * Throws if the timeout is exceeded before a terminal state is reached.
 *
 * With `settleGraceMs` set, an HTTP 410 (price lock lapsed) does not end the
 * wait. Polling continues, because a payment sent near the end of the lock can
 * still be credited. Once the 410 has persisted for `settleGraceMs`, this
 * resolves to `'EXPIRED'`. That result means the SDK stopped waiting, not that
 * the payment is lost; see {@link PollOptions.settleGraceMs}. Without
 * `settleGraceMs`, a 410 throws a {@link PaymentApiError}.
 *
 * @param api     - An authenticated AutoDriveApiHandler
 * @param intentId - The intent ID returned by `createPaymentIntent` or `createUsdcPaymentIntent`
 * @param options - Optional poll interval, timeout and 410 grace (defaults: 3 s / 5 min / none)
 */
export const waitForPaymentCompletion = async (
  api: AutoDriveApiHandler,
  intentId: string,
  { pollIntervalMs = 3_000, timeoutMs = 300_000, settleGraceMs }: PollOptions = {},
): Promise<PaymentIntentTerminalStatus> => {
  if (settleGraceMs !== undefined && !(Number.isFinite(settleGraceMs) && settleGraceMs >= 0)) {
    throw new TypeError(
      `settleGraceMs must be a non-negative finite number, received: ${settleGraceMs}`,
    )
  }

  const deadline = Date.now() + timeoutMs
  // When the current run of 410 responses started; null while the intent reads OK.
  let lapsedSince: number | null = null

  while (Date.now() < deadline) {
    let status: PaymentIntentStatus
    try {
      status = (await getPaymentIntentStatus(api, intentId)).status
    } catch (error) {
      const lockLapsed =
        settleGraceMs !== undefined && error instanceof PaymentApiError && error.status === 410
      if (!lockLapsed) {
        throw error
      }
      lapsedSince = lapsedSince ?? Date.now()
      if (Date.now() - lapsedSince >= settleGraceMs) {
        return 'EXPIRED'
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
      continue
    }
    lapsedSince = null

    if ((TERMINAL_STATUSES as string[]).includes(status)) {
      return status as PaymentIntentTerminalStatus
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(
    `Timed out waiting for payment intent "${intentId}" to complete after ${timeoutMs}ms`,
  )
}
