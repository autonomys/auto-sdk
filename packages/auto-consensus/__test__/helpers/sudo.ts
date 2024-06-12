import { ApiPromise } from '@polkadot/api'
import type { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'
import { signAndSendTx } from './tx'

export const sudo = async (
  api: ApiPromise,
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  log: boolean = true,
) => await signAndSendTx(sender, api.tx.sudo.sudo(tx), log)
