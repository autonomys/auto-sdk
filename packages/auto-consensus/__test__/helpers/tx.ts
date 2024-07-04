import { Events, signAndSendTx as signAndSend } from '@autonomys/auto-consensus'
import type { AddressOrPair, ISubmittableResult, SubmittableExtrinsic } from '@autonomys/auto-utils'

export const signAndSendTx = async (
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  eventsExpected: Events = [],
  log: boolean = true,
) => {
  const result = await signAndSend(sender, tx, eventsExpected, log)

  expect(result.txHash).toBeDefined()
  expect(result.blockHash).toBeDefined()
  expect(result.eventsExpectedMissing).toHaveLength(0)

  return result
}
