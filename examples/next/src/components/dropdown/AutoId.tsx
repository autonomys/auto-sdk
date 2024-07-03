import type { DropDown } from '@/types/layout'
import Link from 'next/link'
import type { FC } from 'react'

interface DropdownProps {
  walletName: string | string[]
  isOpen: boolean
  toggleDropdown: (name: keyof DropDown) => void
}

export const AutoIdDropdown: FC<DropdownProps> = ({ walletName, isOpen, toggleDropdown }) => {
  return (
    <div className='relative'>
      <button
        onClick={() => toggleDropdown('autoId')}
        className='px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none'
      >
        Auto-ID
      </button>
      {isOpen && (
        <div className='absolute mt-2 z-40 bg-white text-black rounded-md shadow-lg'>
          <Link
            key={'id'}
            href={`/wallet/${walletName}/auto-id/id`}
            className='block px-4 py-2 hover:bg-gray-200'
          >
            ID
          </Link>
        </div>
      )}
    </div>
  )
}
