import { useTx } from '@/hooks/useTx'

export const TxReceipt = () => {
  const { txHash, blockHash } = useTx()

  return (
    <>
      {txHash && (
        <div className='mt-4'>
          <b>Transaction Hash:</b> {txHash}
        </div>
      )}
      {blockHash && (
        <div className='mt-4'>
          <b>Block Hash:</b> {blockHash}
        </div>
      )}
    </>
  )
}
