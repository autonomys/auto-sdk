import { useTx } from '@/hooks/useTx'
import { useWallets } from '@/hooks/useWallet'
import { nominateOperator } from '@autonomys/auto-consensus'
import React, { useCallback, useState } from 'react'

export const NominateOperator = () => {
  const [operatorId, setOperatorId] = useState('')
  const [amountToStake, setAmountToStake] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const { selectedWallet } = useWallets()
  const { handleTx, txHash } = useTx()

  const handleNominateOperator = useCallback(async () => {
    if (!selectedWallet) {
      setErrorForm('No wallet selected')
      return
    }
    await handleTx(
      await nominateOperator({
        api: selectedWallet.api,
        operatorId,
        amountToStake,
      }),
      setErrorForm,
    )
  }, [operatorId, amountToStake, selectedWallet])

  return (
    <div className='flex flex-col items-center p-4 rounded shadow-md'>
      <h2 className='text-2xl font-semibold mb-4'>Nominate Operator</h2>
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
      <div className='w-full max-w-xs mt-4'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='amount'>
          Amount to Stake
        </label>
        <input
          id='amountToStake'
          type='number'
          value={amountToStake}
          onChange={(e) => setAmountToStake(e.target.value)}
          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
        />
      </div>
      {errorForm && <div className='mt-4 text-red-500'>{errorForm}</div>}
      <button
        onClick={handleNominateOperator}
        className='mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
      >
        Nominate Operator
      </button>
      {txHash && (
        <div className='mt-4'>
          <b>Transaction Hash:</b> {txHash}
        </div>
      )}
    </div>
  )
}
