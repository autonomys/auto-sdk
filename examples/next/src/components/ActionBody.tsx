'use client'

import { useApi } from '@/hooks/useApi'
import { useWallets } from '@/hooks/useWallet'
import { balance } from '@autonomys/auto-consensus'
import { parseTokenAmount } from '@autonomys/auto-utils'
import { useParams } from 'next/navigation'
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { Balance } from './actions/balance'
import { Deregister } from './actions/deregister'
import { NominateOperator } from './actions/nominate'
import { Operator } from './actions/operator'
import { RegisterOperator } from './actions/register'
import { Transfer } from './actions/transfer'
import { UnlockFunds } from './actions/unlockFunds'
import { UnlockNominator } from './actions/unlockNominator'
import { Withdraw } from './actions/withdraw'

export const ActionBody: FC = () => {
  const params = useParams()
  const { api } = useApi()
  const { selectedWallet } = useWallets()
  const [currentWalletBalance, setCurrentWalletBalance] = useState('0')
  const walletName = params.walletName
  const packageName = params.package
  const action = params.action

  const handleCurrentWalletBalance = useCallback(async () => {
    if (api && selectedWallet && walletName) {
      const _balance = await balance(api, selectedWallet.accounts[0].address)
      setCurrentWalletBalance(_balance.free.toString())
    }
  }, [walletName, api, selectedWallet])

  const body = useMemo(() => {
    switch (packageName) {
      case 'auto-consensus':
        switch (action) {
          case 'balance':
            return <Balance />
          case 'transfer':
            return <Transfer />
          case 'register-operator':
            return <RegisterOperator />
          case 'operator':
            return <Operator />
          case 'nominate-operator':
            return <NominateOperator />
          case 'deregister':
            return <Deregister />
          case 'withdraw':
            return <Withdraw />
          case 'unlock-funds':
            return <UnlockFunds />
          case 'unlock-nominator':
            return <UnlockNominator />
          default:
            return null
        }
      default:
        return null
    }
  }, [packageName, action])

  useEffect(() => {
    handleCurrentWalletBalance()
  }, [handleCurrentWalletBalance])

  return (
    <div className='relative height-full w-1/2'>
      {walletName && (
        <>
          <b>{walletName}</b> wallet has {parseTokenAmount(currentWalletBalance)} tSSC
        </>
      )}
      {packageName && (
        <>
          <br />
          <b>{packageName}</b>
        </>
      )}
      {action ? (
        <>
          <button
            className='w-full bg-transparent border border-white text-white font-mono font-bold p-4 rounded-lg shadow-md'
            // onClick={() => setIsOpen(!isOpen)}
          >
            Action: <b>{action}</b>
          </button>
          <div className='absolute mt-2 w-full bg-[rgba(0,0,0,0.4)] border border-white rounded-lg shadow-lg'>
            {body}
          </div>
        </>
      ) : (
        <div className='height-full' />
      )}
    </div>
  )
}
