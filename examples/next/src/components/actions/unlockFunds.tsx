import { useTx } from '@/hooks/useTx'
import { useWallets } from '@/hooks/useWallet'
import { unlockFunds } from '@autonomys/auto-consensus'
import React, { useCallback, useState } from 'react'

export const UnlockFunds = () => {
  const [operatorId, setOperatorId] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const { selectedWallet } = useWallets()
  const { handleTx, txHash } = useTx()

  const handleUnlockFunds = useCallback(async () => {
    if (!selectedWallet) {
      setErrorForm('No wallet selected')
      return
    }
    await handleTx(
      await unlockFunds({
        api: selectedWallet.api,
        operatorId,
      }),
      setErrorForm,
    )
  }, [operatorId, selectedWallet])

  return (
    <div className='flex flex-col items-center p-4 rounded shadow-md'>
      <h2 className='text-2xl font-semibold mb-4'>Unlock Funds</h2>
      <div className='w-full max-w-xs'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='to'>
          Operator Id
        </label>
        <input
          id='operatorId'
          type='number'
          value={operatorId}
          onChange={(e) => setOperatorId(e.target.value)}
          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
        />
      </div>
      {errorForm && <div className='mt-4 text-red-500'>{errorForm}</div>}
      <button
        onClick={handleUnlockFunds}
        className='mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
      >
        Unlock Funds
      </button>
      {txHash && (
        <div className='mt-4'>
          <b>Transaction Hash:</b> {txHash}
        </div>
      )}
    </div>
  )
}
