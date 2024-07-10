'use client'

import { useNetwork } from '@/hooks/useNetwork'
import type { DropDown } from '@/types/layout'
import { mockURIs, networks } from '@autonomys/auto-utils'
import { useParams } from 'next/navigation'
import React, { useCallback, useState } from 'react'
import { AutoConsensusDropdown } from '../dropdown/AutoConsensus'
import { AutoIdDropdown } from '../dropdown/AutoId'
import { NetworkDropdown } from '../dropdown/Network'

export const Header = () => {
  const params = useParams()
  const { config } = useNetwork()
  const walletName = params.walletName
  const packageName = params.package
  const action = params.action

  const [dropdownOpen, setDropdownOpen] = useState<DropDown>({
    wallet: false,
    autoConsensus: false,
    autoId: false,
    network: false,
  })

  const toggleDropdown = useCallback(
    (position: keyof DropDown) =>
      setDropdownOpen((prevState) => ({ ...prevState, [position]: !prevState[position] })),
    [],
  )

  const link = useCallback(
    (link: string) => {
      if (action && packageName) return link + `/${packageName}/${action}`
      if (packageName) return link + `/${packageName}`
      return link
    },
    [action, packageName],
  )

  return (
    <header className='bg-gray-800 text-white flex justify-between items-center p-4'>
      <div className='flex items-center space-x-4'>
        <div className='relative'>
          <button
            onClick={() => toggleDropdown('wallet')}
            className='px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none'
          >
            Wallet: {walletName || 'Select Wallet'}
          </button>
          {dropdownOpen.wallet && (
            <div className='absolute mt-2 z-40 bg-white text-black rounded-md shadow-lg'>
              {mockURIs.map((uri) => {
                const wallet = uri.slice(2)
                return (
                  <a
                    key={wallet}
                    href={link(`/network/${config.networkId}/wallet/${wallet}`)}
                    onClick={() => toggleDropdown('wallet')}
                    className='block px-4 py-2 hover:bg-gray-200'
                  >
                    {wallet}
                  </a>
                )
              })}
            </div>
          )}
        </div>
        <AutoConsensusDropdown
          networkName={config.networkId}
          walletName={walletName}
          isOpen={dropdownOpen.autoConsensus}
          toggleDropdown={toggleDropdown}
        />
        <AutoIdDropdown
          networkName={config.networkId}
          walletName={walletName}
          isOpen={dropdownOpen.autoId}
          toggleDropdown={toggleDropdown}
        />
        <NetworkDropdown
          walletName={walletName}
          networks={networks}
          isOpen={dropdownOpen.network}
          toggleDropdown={toggleDropdown}
        />
      </div>
    </header>
  )
}
