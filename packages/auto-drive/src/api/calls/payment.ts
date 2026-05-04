import { shannonsToAi3 } from '@autonomys/auto-utils'
import {
  PaymentContractInfo,
  PaymentIntent,
  PaymentIntentStatus,
  PaymentIntentTerminalStatus,
  PollOptions,
} from '../models/payment'
import { AutoDriveApiHandler } from '../types'

const TERMINAL_STATUSES: PaymentIntentTerminalStatus[] = [
  'COMPLETED',
  'EXPIRED',
  'FAILED',
  'OVER_CAP',
]

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
    throw new Error(`Failed to fetch payment contract info: ${response.status} ${response.statusText}`)
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
 * Note: `sizeBytes` is **not** sent to the Auto Drive API. The POST `/intents`
 * endpoint accepts no request body — it returns the current `shannonsPerByte`
 * rate. This function multiplies that rate by `sizeBytes` locally to produce
 * `ai3AmountWei`, saving the caller from doing the BigInt arithmetic themselves.
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
  const [contractInfo, intentRes] = await Promise.all([
    getPaymentContractInfo(api),
    api.sendAPIRequest('/intents', { method: 'POST' }),
  ])

  if (!intentRes.ok) {
    const body = await intentRes.text()
    throw new Error(`Failed to create payment intent: ${intentRes.status} ${body}`)
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
 * Notifies Auto Drive that an on-chain transaction has been submitted for a payment intent.
 *
 * Auto Drive will watch the transaction on-chain and automatically apply storage
 * credits to your account once the transaction is confirmed.
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
    const body = await response.text()
    throw new Error(`Failed to watch payment transaction: ${response.status} ${body}`)
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
    const body = await response.text()
    throw new Error(`Failed to get payment intent status: ${response.status} ${body}`)
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
 * @param api     - An authenticated AutoDriveApiHandler
 * @param intentId - The intent ID returned by `createPaymentIntent`
 * @param options - Optional poll interval and timeout (defaults: 3 s / 5 min)
 */
export const waitForPaymentCompletion = async (
  api: AutoDriveApiHandler,
  intentId: string,
  { pollIntervalMs = 3_000, timeoutMs = 300_000 }: PollOptions = {},
): Promise<PaymentIntentTerminalStatus> => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const { status } = await getPaymentIntentStatus(api, intentId)

    if ((TERMINAL_STATUSES as string[]).includes(status)) {
      return status as PaymentIntentTerminalStatus
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(
    `Timed out waiting for payment intent "${intentId}" to complete after ${timeoutMs}ms`,
  )
}
