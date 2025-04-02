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
    tx.signAndSend(sender, options, async (result: SubmittableResult) => {
      const { events = [], status, dispatchError } = result

      if (status.isInBlock || status.isFinalized) {
        txHashHex = result.txHash.toHex()
        blockHash = status.isInBlock ? status.asInBlock.toHex() : status.asFinalized.toHex()
        if (log) console.log('Successful tx', txHashHex, 'in block', blockHash)

        success = detectTxSuccess(events)

        if (eventsExpected.length > 0) {
          const _events = validateEvents(events, eventsExpected, txHashHex, blockHash, log)
          if (_events.expected.length === 0) resolve(result)
          else reject(new Error('Events not found'))
        } else {
          try {
            events.forEach(({ event: { section, method, data } }) => {
              if (section === 'system' && method === 'ExtrinsicFailed') {
                const dispatchErrorJson = JSON.parse(dispatchError!.toString())
                const errorEnum = mapErrorCodeToEnum?.(dispatchErrorJson.module.error)
                reject(
                  new Error(
                    `Extrinsic failed: ${errorEnum} in block #${blockHash} with error: ${dispatchErrorJson}`,
                  ),
                )
              }
              if (section === 'autoId' && method === 'NewAutoIdRegistered') {
                identifier = data[0].toString()
              }
            })
            resolve(result)
          } catch (err: unknown) {
            reject(
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
        reject(new Error('Transaction failed'))
      }
    })
  })

  return { success, txHash: txHashHex, blockHash, events: eventsValidated, receipt, identifier }
}
