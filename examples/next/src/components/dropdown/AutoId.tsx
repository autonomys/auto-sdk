import type { DropDown } from '@/types/layout'
import Link from 'next/link'
import type { FC } from 'react'

interface DropdownProps {
  networkName: string | string[]
  walletName: string | string[]
  isOpen: boolean
  toggleDropdown: (name: keyof DropDown) => void
}

const Functions = [
  {
    name: 'Auto ID',
    link: 'id',
  },
]

export const AutoIdDropdown: FC<DropdownProps> = ({
  networkName,
  walletName,
  isOpen,
  toggleDropdown,
}) => {
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
          {Functions.map((func) => (
            <Link
              key={func.link}
              href={`/network/${networkName}/wallet/${walletName}/auto-id/${func.link}`}
              onClick={() => toggleDropdown('autoId')}
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
