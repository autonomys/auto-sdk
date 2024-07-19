// file: src/utils/sudo.ts

import type {
  AddressOrPair,
  ApiPromise,
  ISubmittableResult,
  SubmittableExtrinsic,
} from '@autonomys/auto-utils'
import { Events, signAndSendTx } from '@autonomys/auto-utils'
import { expectSuccessfulTxEvent } from './events'

export const sudo = async (
  api: ApiPromise,
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  eventsExpected: Events = expectSuccessfulTxEvent,
  log: boolean = true,
) => await signAndSendTx(sender, api.tx.sudo.sudo(tx), eventsExpected, log)
