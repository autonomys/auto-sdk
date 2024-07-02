import { useApi } from '@/hooks/useApi'
import { balance } from '@autonomys/auto-consensus'
import { parseTokenAmount } from '@autonomys/auto-utils'
import React, { useCallback, useState } from 'react'

export const Balance = () => {
  const [address, setAddress] = useState('')
  const [balanceFree, setBalanceFree] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const { api, handleQuery } = useApi()

  const handleBalance = useCallback(async () => {
    if (!api) {
      setErrorForm('API not loaded')
      return
    }
    handleQuery(await balance(api, address), (v) => setBalanceFree(v.free.toString()), setErrorForm)
  }, [api, address])

  return (
    <div className='flex flex-col items-center p-4 rounded shadow-md'>
      <h2 className='text-2xl font-semibold mb-4'>Balance</h2>
      <div className='w-full max-w-xs'>
        <label className='block text-gray-700 text-sm font-bold mb-2' htmlFor='to'>
          Of
        </label>
        <input
          id='address'
          type='text'
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
        />
      </div>
      {errorForm && <div className='mt-4 text-red-500'>{errorForm}</div>}
      <button
        onClick={handleBalance}
        className='mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
      >
        Balance
      </button>
      {balanceFree && (
        <div className='mt-4'>
          <b>Free:</b> {parseTokenAmount(balanceFree)}
        </div>
      )}
    </div>
  )
}
