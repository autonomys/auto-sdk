import { Events, signAndSendTx as signAndSend } from '@autonomys/auto-consensus'
import type { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'

export const signAndSendTx = async (
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  eventsExpected: Events = [],
  log: boolean = true,
) => {
  const { success, txHash, blockHash, eventsExpectedMissing } = await signAndSend(
    sender,
    tx,
    eventsExpected,
    log,
  )

  expect(txHash).toBeDefined()
  expect(blockHash).toBeDefined()
  expect(eventsExpectedMissing).toHaveLength(0)

  return { success, txHash, blockHash, eventsExpectedMissing }
}
