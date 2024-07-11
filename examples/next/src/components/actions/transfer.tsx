import { useTx } from '@/hooks/useTx'
import { useWallets } from '@/hooks/useWallet'
import { transfer } from '@autonomys/auto-consensus'
import React, { useCallback, useState } from 'react'
import { AmountParams } from '../inputs/AmountInput'
import { ReceiverParams } from '../inputs/ReceiverInput'
import { TxButton } from '../tx/TxButton'

export const Transfer = () => {
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const { selectedWallet } = useWallets()
  const { handleTx } = useTx()

  const handleTransfer = useCallback(async () => {
    if (!selectedWallet) {
      setErrorForm('No wallet selected')
      return
    }
    await handleTx(await transfer(selectedWallet.api, to, amount), setErrorForm)
  }, [to, amount, selectedWallet])

  return (
    <div className='flex flex-col items-center p-4 rounded shadow-md'>
      <h2 className='text-2xl font-semibold mb-4'>Transfer</h2>
      <div className='w-full max-w-xs'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='to'>
          To
        </label>
        <ReceiverParams id='to' value={to} set={setTo} />
      </div>
      <div className='w-full max-w-xs mt-4'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='amount'>
          Amount
        </label>
        <AmountParams
          id='amount'
          value={amount}
          options={['0.01', '1', '5', '10', '100']}
          set={setAmount}
        />
      </div>
      {errorForm && <div className='mt-4 text-red-500'>{errorForm}</div>}
      <TxButton label='Transfer' onClick={handleTransfer} />
    </div>
  )
}
