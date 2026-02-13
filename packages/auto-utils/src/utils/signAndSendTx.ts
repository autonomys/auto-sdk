// file: src/utils/signAndSendTx.ts

import type { SubmittableResult } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import type {
  AddressOrPair,
  Events,
  EventsValidated,
  ISubmittableResult,
  SignerOptions,
  SubmittableExtrinsic,
  TransactionSignedAndSend,
} from '../types'
import { detectTxSuccess } from './detectTxSuccess'
import { expectSuccessfulTxEvent } from './events'
import { validateEvents } from './validateEvents'

/**
 * Signs and sends a transaction to the Autonomys Network, with comprehensive error handling and event validation.
 * 
 * This function handles the complete transaction lifecycle: signing, sending, monitoring for inclusion,
 * and validating expected events. It provides detailed error handling and supports custom error mapping
 * for domain-specific error handling. The function waits for the transaction to be included in a block
 * and validates that expected events were emitted.
 * 
 * @param sender - The account to sign and send the transaction. Can be a KeyringPair, address string, or AddressOrPair.
 * @param tx - The submittable extrinsic to sign and send.
 * @param options - Optional signer options including nonce, tip, and other transaction parameters.
 * @param eventsExpected - Array of expected event names to validate. Defaults to successful transaction events.
 * @param log - Whether to log transaction progress to console. Defaults to false.
 * @param mapErrorCodeToEnum - Optional function to map error codes to custom error enums for better error handling.
 * @returns Promise resolving to transaction results including success status, hashes, events, and receipt.
 * 
 * @example
 * import { signAndSendTx, activate, setupWallet } from '@autonomys/auto-utils'
 * 
 * // Basic transaction signing and sending
 * const api = await activate({ networkId: 'taurus' })
 * const wallet = setupWallet({ uri: '//Alice' })
 * 
 * const tx = api.tx.balances.transfer('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 1000000000000000000n)
 * 
 * const result = await signAndSendTx(wallet.keyringPair, tx)
 * if (result.success) {
 *   console.log('Transaction successful')
 *   console.log('Transaction hash:', result.txHash)
 *   console.log('Block hash:', result.blockHash)
 * }
 * 
 * // With custom options and event validation
 * const transferTx = api.tx.balances.transfer(receiverAddress, amount)
 * const transferResult = await signAndSendTx(
 *   senderKeyringPair,
 *   transferTx,
 *   { tip: 1000000000000000n }, // Custom tip
 *   ['balances.Transfer'], // Expected events
 *   true // Enable logging
 * )
 * 
 * // With error mapping for custom error handling
 * const stakingTx = api.tx.domains.nominateOperator(operatorId, amount)
 * const stakingResult = await signAndSendTx(
 *   nominatorKeyringPair,
 *   stakingTx,
 *   {},
 *   ['domains.OperatorNominated'],
 *   false,
 *   (errorCode) => {
 *     // Map error codes to custom error types
 *     switch (errorCode) {
 *       case '0': return 'InsufficientBalance'
 *       case '1': return 'OperatorNotFound'
 *       default: return undefined
 *     }
 *   }
 * )
 * 
 * // Handle Auto-ID registration with identifier extraction
 * const autoIdTx = api.tx.autoId.registerAutoId(autoIdData)
 * const autoIdResult = await signAndSendTx(sender, autoIdTx)
 * if (autoIdResult.identifier) {
 *   console.log('Auto-ID registered with identifier:', autoIdResult.identifier)
 * }
 * 
 * @throws {Error} When the transaction fails, times out, or expected events are not found.
 * @throws {Error} When the transaction is retracted, dropped, or invalid.
 * @throws {Error} When custom error mapping indicates a specific error condition.
 */
export const signAndSendTx = async <TError>(
  sender: AddressOrPair | KeyringPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  options: Partial<SignerOptions> = {},
  eventsExpected: Events = expectSuccessfulTxEvent,
  log: boolean = false,
  mapErrorCodeToEnum?: (errorCode: string) => TError | undefined,
): Promise<
  TransactionSignedAndSend & { receipt: SubmittableResult; identifier?: string | null }
> => {
  let success = false
  let txHashHex: string | undefined = undefined
  let blockHash: string | undefined = undefined
  const eventsValidated: EventsValidated = { expected: [], found: [] }
  let identifier: string | null = null

  const receipt: SubmittableResult = await new Promise((resolve, reject) => {
    let settled = false
    let unsub: (() => void) | undefined

    const cleanup = () => {
      if (unsub) {
        try { unsub() } catch { /* ignore */ }
      }
    }
    const safeResolve = (v: SubmittableResult) => {
      if (!settled) { settled = true; cleanup(); resolve(v) }
    }
    const safeReject = (e: unknown) => {
      if (!settled) { settled = true; cleanup(); reject(e) }
    }

    try {
      const outerPromise = tx.signAndSend(sender, options, async (result: SubmittableResult) => {
        const { events = [], status, dispatchError } = result

        if (status.isInBlock || status.isFinalized) {
          txHashHex = result.txHash.toHex()
          blockHash = status.isInBlock ? status.asInBlock.toHex() : status.asFinalized.toHex()
          if (log) console.log('Successful tx', txHashHex, 'in block', blockHash)

          success = detectTxSuccess(events)

          if (eventsExpected.length > 0) {
            const _events = validateEvents(events, eventsExpected, txHashHex, blockHash, log)
            if (_events.expected.length === 0) safeResolve(result)
            else safeReject(new Error('Events not found'))
          } else {
            try {
              events.forEach(({ event: { section, method, data } }) => {
                if (section === 'system' && method === 'ExtrinsicFailed') {
                  const dispatchErrorJson = JSON.parse(dispatchError!.toString())
                  const errorEnum = mapErrorCodeToEnum?.(dispatchErrorJson.module.error)
                  safeReject(
                    new Error(
                      `Extrinsic failed: ${errorEnum} in block #${blockHash} with error: ${dispatchErrorJson}`,
                    ),
                  )
                }
                if (section === 'autoId' && method === 'NewAutoIdRegistered') {
                  identifier = data[0].toString()
                }
              })
              safeResolve(result)
            } catch (err: unknown) {
              safeReject(
                new Error(
                  `Failed to retrieve block information: ${err instanceof Error ? err.message : String(err)}`,
                ),
              )
            }
          }
        } else if (
          status.isRetracted ||
          status.isFinalityTimeout ||
          status.isDropped ||
          status.isInvalid
        ) {
          if (log) console.error('Transaction failed')
          safeReject(new Error('Transaction failed'))
        }
      })

      // The outer promise resolves to an unsubscribe fn on success,
      // but rejects if the wallet denies the signing request.
      if (outerPromise && typeof (outerPromise as unknown as Promise<unknown>).then === 'function') {
        ;(outerPromise as unknown as Promise<unknown>).then(
          (fn) => { if (typeof fn === 'function') unsub = fn as () => void },
          safeReject,
        )
      }
    } catch (err) {
      // Synchronous throw from signAndSend (some wallet extension implementations)
      safeReject(err)
    }
  })

  return { success, txHash: txHashHex, blockHash, events: eventsValidated, receipt, identifier }
}
