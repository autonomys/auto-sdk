import type { DropDown } from '@/types/layout'
import Link from 'next/link'
import type { FC } from 'react'

interface DropdownProps {
  walletName: string | string[]
  isOpen: boolean
  toggleDropdown: (name: keyof DropDown) => void
}

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
          <Link
            key={'balance'}
            href={`/wallet/${walletName}/auto-consensus/balance`}
            className='block px-4 py-2 hover:bg-gray-200'
          >
            Balance
          </Link>
          <Link
            key={'transfer'}
            href={`/wallet/${walletName}/auto-consensus/transfer`}
            className='block px-4 py-2 hover:bg-gray-200'
          >
            Transfer
          </Link>
          <Link
            key={'staking'}
            href={`/wallet/${walletName}/auto-consensus/register-operator`}
            className='block px-4 py-2 hover:bg-gray-200'
          >
            Register Operator
          </Link>
          <Link
            key={'staking'}
            href={`/wallet/${walletName}/auto-consensus/operator`}
            className='block px-4 py-2 hover:bg-gray-200'
          >
            Operator Details
          </Link>
          <Link
            key={'nominate'}
            href={`/wallet/${walletName}/auto-consensus/nominate-operator`}
            className='block px-4 py-2 hover:bg-gray-200'
          >
            Nominate Operator
          </Link>
          <Link
            key={'withdraw'}
            href={`/wallet/${walletName}/auto-consensus/withdraw`}
            className='block px-4 py-2 hover:bg-gray-200'
          >
            Withdraw
          </Link>
          <Link
            key={'deregister'}
            href={`/wallet/${walletName}/auto-consensus/deregister`}
            className='block px-4 py-2 hover:bg-gray-200'
          >
            Deregister Operator
          </Link>
          <Link
            key={'unlockFunds'}
            href={`/wallet/${walletName}/auto-consensus/unlock-funds`}
            className='block px-4 py-2 hover:bg-gray-200'
          >
            Unlock Funds
          </Link>
          <Link
            key={'unlockNominator'}
            href={`/wallet/${walletName}/auto-consensus/unlock-nominator`}
            className='block px-4 py-2 hover:bg-gray-200'
          >
            Unlock Nominator
          </Link>
        </div>
      )}
    </div>
  )
}
