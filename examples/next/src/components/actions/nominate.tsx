import { useTx } from '@/hooks/useTx'
import { useWallets } from '@/hooks/useWallet'
import { nominateOperator } from '@autonomys/auto-consensus'
import React, { useCallback, useState } from 'react'
import { AmountParams } from '../inputs/AmountParams'
import { OperatorIdParams } from '../inputs/OperatorIdParams'
import { TxButton } from '../tx/TxButton'

export const NominateOperator = () => {
  const [operatorId, setOperatorId] = useState('')
  const [amountToStake, setAmountToStake] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const { selectedWallet } = useWallets()
  const { handleTx } = useTx()

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
        <OperatorIdParams value={operatorId} set={setOperatorId} />
      </div>
      <div className='w-full max-w-xs mt-4'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='amount'>
          Amount to Stake
        </label>
        <AmountParams id='amountToStake' value={amountToStake} set={setAmountToStake} />
      </div>
      {errorForm && <div className='mt-4 text-red-500'>{errorForm}</div>}
      <TxButton label='Nominate Operator' onClick={handleNominateOperator} />
    </div>
  )
}
