import { useNetwork } from '@/hooks/useNetwork'
import { useTx } from '@/hooks/useTx'
import { useWallets } from '@/hooks/useWallet'
import { registerOperator } from '@autonomys/auto-consensus'
import { ActivateWalletInput, activateWallet } from '@autonomys/auto-utils'
import React, { useCallback, useState } from 'react'

export const RegisterOperator = () => {
  const [operatorSeed, setOperatorSeed] = useState('')
  const [domainId, setDomainId] = useState('')
  const [amountToStake, setAmountToStake] = useState('')
  const [minimumNominatorStake, setMinimumNominatorStake] = useState('')
  const [nominationTax, setNominationTax] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const { config } = useNetwork()
  const { selectedWallet } = useWallets()
  const { handleTx, txHash } = useTx()

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
        <input
          id='domainId'
          type='number'
          value={domainId}
          onChange={(e) => setDomainId(e.target.value)}
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
      <div className='w-full max-w-xs mt-4'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='amount'>
          Minimum Nominator Stake
        </label>
        <input
          id='minimumNominatorStake'
          type='number'
          value={minimumNominatorStake}
          onChange={(e) => setMinimumNominatorStake(e.target.value)}
          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
        />
      </div>
      <div className='w-full max-w-xs mt-4'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='amount'>
          Nomination Tax
        </label>
        <input
          id='nominationTax'
          type='number'
          value={nominationTax}
          onChange={(e) => setNominationTax(e.target.value)}
          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
        />
      </div>
      {errorForm && <div className='mt-4 text-red-500'>{errorForm}</div>}
      <button
        onClick={handleRegisterOperator}
        className='mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
      >
        Register Operator
      </button>
      {txHash && (
        <div className='mt-4'>
          <b>Transaction Hash:</b> {txHash}
        </div>
      )}
    </div>
  )
}
