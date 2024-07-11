import { useApi } from '@/hooks/useApi'
import { useWallets } from '@/hooks/useWallet'
import { operator, OperatorDetails } from '@autonomys/auto-consensus'
import React, { useCallback, useState } from 'react'
import { OperatorIdParams } from '../inputs/OperatorIdInput'

export const Operator = () => {
  const [operatorId, setOperatorId] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [operatorDetails, setOperatorDetails] = useState<OperatorDetails | null>(null)
  const { api, handleQuery } = useApi()
  const { selectedWallet } = useWallets()

  const handleOperator = useCallback(async () => {
    if (!api) {
      setErrorForm('API not loaded')
      return
    }
    handleQuery(await operator(api, operatorId), setOperatorDetails, setErrorForm)
  }, [api, operatorId, selectedWallet])

  return (
    <div className='flex flex-col items-center p-4 rounded shadow-md'>
      <h2 className='text-2xl font-semibold mb-4'>Operator Details</h2>
      <div className='w-full max-w-xs'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='to'>
          Operator Id
        </label>
        <OperatorIdParams value={operatorId} set={setOperatorId} />
      </div>
      {errorForm && <div className='mt-4 text-red-500'>{errorForm}</div>}
      <button
        onClick={handleOperator}
        className='mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
      >
        Query Details
      </button>
      {operatorDetails && (
        <div className='mt-4'>
          <b>Operator details:</b> <br />
          Current domainId: {operatorDetails.currentDomainId.toString()} <br />
          Next domainId: {operatorDetails.nextDomainId.toString()} <br />
          Minimum Nominator Stake: {operatorDetails.minimumNominatorStake.toString()} <br />
          Nomination Tax: {operatorDetails.nominationTax.toString()} <br />
          Current Total Stake: {operatorDetails.currentTotalStake.toString()} <br />
          Current Epoch Rewards: {operatorDetails.currentEpochRewards.toString()} <br />
          Current Total Shares: {operatorDetails.currentTotalShares.toString()} <br />
          Deposits in Epoch: {operatorDetails.depositsInEpoch.toString()} <br />
          Withdrawals in Epoch: {operatorDetails.withdrawalsInEpoch.toString()} <br />
          Total Storage Fee Deposit: {operatorDetails.totalStorageFeeDeposit.toString()} <br />
        </div>
      )}
    </div>
  )
}
