import type { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'
import 'dotenv/config'

export const signAndSend = async (
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
) => {
  let txHashHex: string | undefined = undefined
  let blockHash: string | undefined = undefined
  let success = false

  await new Promise<void>((resolve, reject) => {
    tx.signAndSend(sender, ({ events, status, txHash }) => {
      if (status.isInBlock) {
        txHashHex = txHash.toHex()
        blockHash = status.asInBlock.toHex()
        console.log('\x1b[32m%s\x1b[0m', 'Successful tx', txHashHex)
        console.log('\x1b[32m%s\x1b[0m', 'In block', blockHash, '\n')

        events.forEach(({ event: { data, method, section } }) => {
          if (section === 'system' && method === 'ExtrinsicSuccess') success = true
          console.log(
            'Event Emitted:',
            '\x1b[33m',
            `${section}.${method}`,
            '\x1b[0m',
            data.toString(),
          )
        })
        resolve()
      } else if (
        status.isRetracted ||
        status.isFinalityTimeout ||
        status.isDropped ||
        status.isInvalid
      ) {
        console.error('Transaction failed')
        reject(new Error('Transaction failed'))
      }
    })
  })

  return { txHashHex, blockHash, success }
}
