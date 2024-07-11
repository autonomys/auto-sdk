import { useNetwork } from '@/hooks/useNetwork'
import { useTx } from '@/hooks/useTx'
import { useWallets } from '@/hooks/useWallet'
import { registerOperator } from '@autonomys/auto-consensus'
import { ActivateWalletInput, activateWallet } from '@autonomys/auto-utils'
import React, { useCallback, useState } from 'react'
import { AmountInput } from '../inputs/AmountInput'
import { OperatorIdInput } from '../inputs/OperatorIdInput'
import { TxButton } from '../tx/TxButton'

export const RegisterOperator = () => {
  const [operatorSeed, setOperatorSeed] = useState('')
  const [domainId, setDomainId] = useState('')
  const [amountToStake, setAmountToStake] = useState('')
  const [minimumNominatorStake, setMinimumNominatorStake] = useState('')
  const [nominationTax, setNominationTax] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const { config } = useNetwork()
  const { selectedWallet } = useWallets()
  const { handleTx } = useTx()

  const handleRegisterOperator = useCallback(async () => {
    if (!selectedWallet) {
      setErrorForm('No wallet selected')
      return
    }
    const { accounts: operatorAccounts } = await activateWallet({
      ...config,
      uri: operatorSeed,
    } as ActivateWalletInput)
    await handleTx(
      await registerOperator({
        api: selectedWallet.api,
        senderAddress: selectedWallet.accounts[0].address,
        Operator: operatorAccounts[0],
        domainId,
        amountToStake,
        minimumNominatorStake,
        nominationTax,
      }),
      setErrorForm,
    )
  }, [amountToStake, selectedWallet, domainId, minimumNominatorStake, nominationTax, operatorSeed])

  return (
    <div className='flex flex-col items-center p-4 rounded shadow-md'>
      <h2 className='text-2xl font-semibold mb-4'>Register Operator</h2>
      <div className='w-full max-w-xs'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='to'>
          Operator Keystore seed
        </label>
        <input
          id='operatorSeed'
          type='text'
          value={operatorSeed}
          onChange={(e) => setOperatorSeed(e.target.value)}
          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
        />
      </div>
      <div className='w-full max-w-xs'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='to'>
          Domain Id
        </label>
        <OperatorIdInput id='domainId' value={domainId} set={setDomainId} />
      </div>
      <div className='w-full max-w-xs mt-4'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='amount'>
          Amount to Stake
        </label>
        <AmountInput
          id='amountToStake'
          value={amountToStake}
          options={['100', '250', '500', '1000']}
          set={setAmountToStake}
        />
      </div>
      <div className='w-full max-w-xs mt-4'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='amount'>
          Minimum Nominator Stake
        </label>
        <AmountInput
          id='minimumNominatorStake'
          value={minimumNominatorStake}
          options={['0', '1', '50', '100']}
          set={setMinimumNominatorStake}
        />
      </div>
      <div className='w-full max-w-xs mt-4'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='amount'>
          Nomination Tax
        </label>
        <AmountInput
          id='nominationTax'
          value={nominationTax}
          options={['1', '5', '10']}
          set={setNominationTax}
          formatOption={(e) => e.toString()}
        />
      </div>
      {errorForm && <div className='mt-4 text-red-500'>{errorForm}</div>}
      <TxButton label='Register Operator' onClick={handleRegisterOperator} />
    </div>
  )
}
