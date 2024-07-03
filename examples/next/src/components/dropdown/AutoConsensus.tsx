import type { DropDown } from '@/types/layout'
import Link from 'next/link'
import type { FC } from 'react'

interface DropdownProps {
  walletName: string | string[]
  isOpen: boolean
  toggleDropdown: (name: keyof DropDown) => void
}

const Functions = [
  {
    name: 'Balance',
    link: 'balance',
  },
  {
    name: 'Transfer',
    link: 'transfer',
  },
  {
    name: 'Register Operator',
    link: 'register-operator',
  },
  {
    name: 'Operator Details',
    link: 'operator',
  },
  {
    name: 'Nominate Operator',
    link: 'nominate-operator',
  },
  {
    name: 'Withdraw',
    link: 'withdraw',
  },
  {
    name: 'Deregister Operator',
    link: 'deregister',
  },
  {
    name: 'Unlock Funds',
    link: 'unlock-funds',
  },
  {
    name: 'Unlock Nominator',
    link: 'unlock-nominator',
  },
]

export const AutoConsensusDropdown: FC<DropdownProps> = ({
  walletName,
  isOpen,
  toggleDropdown,
}) => {
  return (
    <div className='relative'>
      <button
        onClick={() => toggleDropdown('autoConsensus')}
        className='px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none'
      >
        Auto-Consensus
      </button>
      {isOpen && (
        <div className='absolute mt-2 z-40 bg-white text-black rounded-md shadow-lg'>
          {Functions.map((func) => (
            <Link
              key={func.name}
              href={`/wallet/${walletName}/auto-consensus/${func.link}`}
              onClick={() => toggleDropdown('autoConsensus')}
              className='block px-4 py-2 hover:bg-gray-200'
            >
              {func.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
