// file: src/utils/signAndSendTx.ts

import type { AutoIdError } from '@autonomys/auto-id'
import type { ApiPromise, SubmittableResult } from '@polkadot/api'
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

export const signAndSendTx = async (
  api: ApiPromise,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  sender: AddressOrPair | KeyringPair,
  options: Partial<SignerOptions> = {},
  eventsExpected: Events = expectSuccessfulTxEvent,
  log: boolean = false,
  mapErrorCodeToEnum?: (errorCode: string) => AutoIdError | null,
): Promise<
  TransactionSignedAndSend & { receipt: SubmittableResult; identifier?: string | null }
> => {
  let success = false
  let txHashHex: string | undefined = undefined
  let blockHash: string | undefined = undefined
  let eventsValidated: EventsValidated = { expected: [], found: [] }
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
            const signedBlock = await api.rpc.chain.getBlock(blockHash)
            events.forEach(({ event: { section, method, data } }) => {
              if (section === 'system' && method === 'ExtrinsicFailed') {
                const dispatchErrorJson = JSON.parse(dispatchError!.toString())
                reject(
                  new Error(
                    `Extrinsic failed: ${mapErrorCodeToEnum?.(dispatchErrorJson.module.error)} in block #${signedBlock.block.header.number.toString()}`,
                  ),
                )
              }
              if (section === 'autoId' && method === 'NewAutoIdRegistered') {
                identifier = data[0].toString()
              }
            })
            resolve(result)
          } catch (err: any) {
            reject(new Error(`Failed to retrieve block information: ${err.message}`))
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
