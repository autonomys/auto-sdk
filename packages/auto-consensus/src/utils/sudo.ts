// file: src/utils/sudo.ts

import {
  AddressOrPair,
  ApiPromise,
  Events,
  ISubmittableResult,
  signAndSendTx,
  SignerOptions,
  SubmittableExtrinsic,
} from '@autonomys/auto-utils'
import { expectSuccessfulTxEvent } from './events'

export const sudo = async (
  api: ApiPromise,
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  options: Partial<SignerOptions> = {},
  eventsExpected: Events = expectSuccessfulTxEvent,
  log: boolean = true,
) => await signAndSendTx(sender, api.tx.sudo.sudo(tx), options, eventsExpected, log)
