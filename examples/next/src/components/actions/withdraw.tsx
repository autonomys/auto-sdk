import { useApi } from '@/hooks/useApi'
import { useWallets } from '@/hooks/useWallet'
import { withdrawStake } from '@autonomys/auto-consensus'
import React, { useCallback, useState } from 'react'

export const Withdraw = () => {
  const [operatorId, setOperatorId] = useState('')
  const [shares, setShares] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [txHash, setTxHash] = useState('')
  const { api } = useApi()
  const { selectedWallet } = useWallets()

  const handleWithdrawStake = useCallback(async () => {
    setErrorForm('')
    try {
      if (!api || !selectedWallet) {
        setErrorForm('API not loaded')
        return
      }

      const tx = await withdrawStake({
        api: selectedWallet.api,
        operatorId,
        shares,
      })
      if (!tx) {
        setErrorForm('Error creating withdraw stake tx')
        return
      }

      setTxHash(tx.hash.toString())

      await tx.signAndSend(selectedWallet.accounts[0], (result: any) => {
        console.log('withdraw result', result)
        if (result.status.isInBlock) {
          console.log('Successful withdraw of operator')
        } else if (result.status.isFinalized) {
          console.log('Finalized withdraw of operator')
        }
      })
    } catch (error) {
      setErrorForm((error as any).message)
    }
  }, [api, selectedWallet])

  return (
    <div className='flex flex-col items-center p-4 rounded shadow-md'>
      <h2 className='text-2xl font-semibold mb-4'>Withdraw Stake</h2>
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
          Qty of Shares
        </label>
        <input
          id='shares'
          type='number'
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
        />
      </div>
      {errorForm && <div className='mt-4 text-red-500'>{errorForm}</div>}
      <button
        onClick={handleWithdrawStake}
        className='mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
      >
        Withdraw Stake
      </button>
      {txHash && (
        <div className='mt-4'>
          <b>Transaction Hash:</b> {txHash}
        </div>
      )}
    </div>
  )
}
