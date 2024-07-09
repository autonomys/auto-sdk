// file: src/utils/sudo.ts

import type {
  AddressOrPair,
  ApiPromise,
  ISubmittableResult,
  SubmittableExtrinsic,
} from '@autonomys/auto-utils'
import type { Events } from '../types/events'
import { expectSuccessfulTxEvent } from './events'
import { signAndSendTx } from './signAndSendTx'

export const sudo = async (
  api: ApiPromise,
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  eventsExpected: Events = expectSuccessfulTxEvent,
  log: boolean = true,
) => await signAndSendTx(sender, api.tx.sudo.sudo(tx), eventsExpected, log)
