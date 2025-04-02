import { useWallets } from '@/hooks/useWallet'
import { mockURIs } from '@autonomys/auto-utils'
import { FC } from 'react'

interface InputProps {
  id?: string
  value?: string
  set?: (e: string) => void
}

export const ReceiverInput: FC<InputProps> = ({ id = 'to', value, set }) => {
  const { walletsSigners } = useWallets()

  return (
    <div className='relative inline-block'>
      <input
        id={id}
        type='text'
        value={value}
        onChange={(e) => set && set(e.target.value)}
        className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
      />
      {walletsSigners.map((wallet, index) => (
        <>
          <button
            key={`address-receiver-index-${index}`}
            className={'relative items-center gap-2 rounded-full'}
            onClick={() => set && set(wallet.accounts[0].address)}
          >
            {mockURIs[index].slice(2)}
          </button>
          {' '}
        </>
      ))}
    </div>
  )
}
