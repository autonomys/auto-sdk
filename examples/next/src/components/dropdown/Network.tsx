import { useNetwork } from '@/hooks/useNetwork'
import type { DropDown } from '@/types/layout'
import type { Network } from '@autonomys/auto-utils'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { FC } from 'react'

interface DropdownProps {
  walletName: string | string[]
  networks: Network[]
  isOpen: boolean
  toggleDropdown: (name: keyof DropDown) => void
}

export const NetworkDropdown: FC<DropdownProps> = ({
  walletName,
  networks,
  isOpen,
  toggleDropdown,
}) => {
  const { handleNetworkChange } = useNetwork()
  const params = useParams()
  const packageName = params.package
  const action = params.action

  return (
    <div className='relative'>
      <button
        onClick={() => toggleDropdown('network')}
        className='px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none'
      >
        Network
      </button>
      {isOpen && (
        <div className='absolute mt-2 z-40 bg-white text-black rounded-md shadow-lg'>
          {networks.map((network) => (
            <Link
              key={network.id}
              href={`/network/${network.id}/wallet/${walletName}/${packageName}/${action}`}
              onClick={() => toggleDropdown('network')}
              className='block px-4 py-2 hover:bg-gray-200'
            >
              {network.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
