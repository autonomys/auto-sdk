import { useTx } from '@/hooks/useTx'
import { useWallets } from '@/hooks/useWallet'
import { deregisterOperator } from '@autonomys/auto-consensus'
import React, { useCallback, useState } from 'react'
import { OperatorIdParams } from '../inputs/OperatorIdInput'
import { TxButton } from '../tx/TxButton'

export const Deregister = () => {
  const [operatorId, setOperatorId] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const { selectedWallet } = useWallets()
  const { handleTx } = useTx()

  const handleDeregisterOperator = useCallback(async () => {
    if (!selectedWallet) {
      setErrorForm('No wallet selected')
      return
    }
    await handleTx(await deregisterOperator({ api: selectedWallet.api, operatorId }), setErrorForm)
  }, [operatorId, selectedWallet])

  return (
    <div className='flex flex-col items-center p-4 rounded shadow-md'>
      <h2 className='text-2xl font-semibold mb-4'>Deregister Operator</h2>
      <div className='w-full max-w-xs'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='to'>
          Operator Id
        </label>
        <OperatorIdParams value={operatorId} set={setOperatorId} />
      </div>
      {errorForm && <div className='mt-4 text-red-500'>{errorForm}</div>}
      <TxButton label='Deregister Operator' onClick={handleDeregisterOperator} />
    </div>
  )
}
