import { useApi } from '@/hooks/useApi'
import { useWallets } from '@/hooks/useWallet'
import { transfer } from '@autonomys/auto-consensus'
import React, { useCallback, useState } from 'react'

export const Transfer = () => {
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [txHash, setTxHash] = useState('')
  const { api } = useApi()
  const { selectedWallet } = useWallets()

  const handleTransfer = useCallback(async () => {
    setErrorForm('')
    try {
      if (!api || !selectedWallet) {
        setErrorForm('API not loaded')
        return
      }

      const tx = await transfer(selectedWallet.api, to, amount)
      if (!tx) {
        setErrorForm('Transfer failed')
        return
      }

      setTxHash(tx.hash.toString())

      await tx.signAndSend(selectedWallet.accounts[0], (result: any) => {
        console.log('transferTx result', result)
        if (result.status.isInBlock) {
          console.log('Successful transfer')
        } else if (result.status.isFinalized) {
          console.log('Finalized transfer')
        }
      })
    } catch (error) {
      setErrorForm((error as any).message)
    }
  }, [api, to, amount, selectedWallet])

  return (
    <div className='flex flex-col items-center p-4 rounded shadow-md'>
      <h2 className='text-2xl font-semibold mb-4'>Transfer</h2>
      <div className='w-full max-w-xs'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='to'>
          To
        </label>
        <input
          id='to'
          type='text'
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
        />
      </div>
      <div className='w-full max-w-xs mt-4'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='amount'>
          Amount
        </label>
        <input
          id='amount'
          type='number'
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
        />
      </div>
      {errorForm && <div className='mt-4 text-red-500'>{errorForm}</div>}
      <button
        onClick={handleTransfer}
        className='mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
      >
        Transfer
      </button>
      {txHash && (
        <div className='mt-4'>
          <b>Transaction Hash:</b> {txHash}
        </div>
      )}
    </div>
  )
}
