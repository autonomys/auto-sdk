import { useApi } from '@/hooks/useApi'
import { useWallets } from '@/hooks/useWallet'
import { deregisterOperator } from '@autonomys/auto-consensus'
import React, { useCallback, useState } from 'react'

export const Deregister = () => {
  const [operatorId, setOperatorId] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [txHash, setTxHash] = useState('')
  const { api } = useApi()
  const { selectedWallet } = useWallets()

  const handleDeregisterOperator = useCallback(async () => {
    setErrorForm('')
    try {
      if (!api || !selectedWallet) {
        setErrorForm('API not loaded')
        return
      }

      const tx = await deregisterOperator({
        api: selectedWallet.api,
        operatorId,
      })
      if (!tx) {
        setErrorForm('Error creating deregister operator tx')
        return
      }

      setTxHash(tx.hash.toString())

      await tx.signAndSend(selectedWallet.accounts[0], (result: any) => {
        console.log('deregister result', result)
        if (result.status.isInBlock) {
          console.log('Successful deregister of operator')
        } else if (result.status.isFinalized) {
          console.log('Finalized deregister of operator')
        }
      })
    } catch (error) {
      setErrorForm((error as any).message)
    }
  }, [api, selectedWallet])

  return (
    <div className='flex flex-col items-center p-4 rounded shadow-md'>
      <h2 className='text-2xl font-semibold mb-4'>Deregister Operator</h2>
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
        onClick={handleDeregisterOperator}
        className='mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
      >
        Deregister Operator
      </button>
      {txHash && (
        <div className='mt-4'>
          <b>Transaction Hash:</b> {txHash}
        </div>
      )}
    </div>
  )
}
