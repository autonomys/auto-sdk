import type { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'

export const signAndSendTx = async (
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  log: boolean = true,
) => {
  let blockHash: string | undefined = undefined
  await new Promise<void>((resolve, reject) => {
    tx.signAndSend(sender, ({ status }) => {
      if (status.isInBlock) {
        blockHash = status.asInBlock.toHex()
        if (log) console.log('Successful transfer of 1 with block hash ' + blockHash)
        resolve()
      } else if (
        status.isRetracted ||
        status.isFinalityTimeout ||
        status.isDropped ||
        status.isInvalid
      ) {
        if (log) console.error('Transaction failed')
        reject(new Error('Transaction failed'))
      } else if (log) console.log('Status of transfer: ' + status.type)
    })
  })
  expect(blockHash).toBeDefined()

  return blockHash
}
