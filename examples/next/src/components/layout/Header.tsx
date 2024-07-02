'use client'

import { useNetwork } from '@/hooks/useNetwork'
import { mockURIs } from '@autonomys/auto-utils'
import { useParams } from 'next/navigation'
import React, { useCallback, useState } from 'react'

type DropDowns = {
  wallet: boolean
  autoConsensus: boolean
  autoId: boolean
  settings: boolean
}

export const Header = () => {
  const params = useParams()
  const { config } = useNetwork()
  const walletName = params.walletName
  const packageName = params.package
  const action = params.action

  const [dropdownOpen, setDropdownOpen] = useState<DropDowns>({
    wallet: false,
    autoConsensus: false,
    autoId: false,
    settings: false,
  })

  const toggleDropdown = useCallback((position: keyof DropDowns) => {
    setDropdownOpen((prevState) => ({ ...prevState, [position]: !prevState[position] }))
  }, [])

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
                    href={link(`/wallet/${wallet}`)}
                    className='block px-4 py-2 hover:bg-gray-200'
                  >
                    {wallet}
                  </a>
                )
              })}
            </div>
          )}
        </div>
        <div className='relative'>
          <button
            onClick={() => toggleDropdown('autoConsensus')}
            className='px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none'
          >
            Auto-Consensus
          </button>
          {dropdownOpen.autoConsensus && (
            <div className='absolute mt-2 z-40 bg-white text-black rounded-md shadow-lg'>
              <a
                key={'balance'}
                href={`/wallet/${walletName}/auto-consensus/balance`}
                className='block px-4 py-2 hover:bg-gray-200'
              >
                Balance
              </a>
              <a
                key={'transfer'}
                href={`/wallet/${walletName}/auto-consensus/transfer`}
                className='block px-4 py-2 hover:bg-gray-200'
              >
                Transfer
              </a>
              <a
                key={'staking'}
                href={`/wallet/${walletName}/auto-consensus/register-operator`}
                className='block px-4 py-2 hover:bg-gray-200'
              >
                Register Operator
              </a>
              <a
                key={'staking'}
                href={`/wallet/${walletName}/auto-consensus/operator`}
                className='block px-4 py-2 hover:bg-gray-200'
              >
                Operator Details
              </a>
              <a
                key={'nominate'}
                href={`/wallet/${walletName}/auto-consensus/nominate-operator`}
                className='block px-4 py-2 hover:bg-gray-200'
              >
                Nominate Operator
              </a>
              <a
                key={'withdraw'}
                href={`/wallet/${walletName}/auto-consensus/withdraw`}
                className='block px-4 py-2 hover:bg-gray-200'
              >
                Withdraw
              </a>
              <a
                key={'deregister'}
                href={`/wallet/${walletName}/auto-consensus/deregister`}
                className='block px-4 py-2 hover:bg-gray-200'
              >
                Deregister Operator
              </a>
              <a
                key={'unlockFunds'}
                href={`/wallet/${walletName}/auto-consensus/unlock-funds`}
                className='block px-4 py-2 hover:bg-gray-200'
              >
                Unlock Funds
              </a>
              <a
                key={'unlockNominator'}
                href={`/wallet/${walletName}/auto-consensus/unlock-nominator`}
                className='block px-4 py-2 hover:bg-gray-200'
              >
                Unlock Nominator
              </a>
            </div>
          )}
        </div>
        <div className='relative'>
          <button
            onClick={() => toggleDropdown('autoId')}
            className='px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none'
          >
            Auto-ID
          </button>
          {dropdownOpen.autoId && (
            <div className='absolute mt-2 z-40 bg-white text-black rounded-md shadow-lg'>
              <a
                key={'id'}
                href={`/wallet/${walletName}/auto-id/id`}
                className='block px-4 py-2 hover:bg-gray-200'
              >
                ID
              </a>
            </div>
          )}
        </div>
        <div className='relative'>
          <button
            onClick={() => toggleDropdown('settings')}
            className='px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none'
          >
            Settings
          </button>
          {dropdownOpen.settings && (
            <div className='absolute mt-2 z-40 bg-white text-black rounded-md shadow-lg'>
              <a
                key={'id'}
                href={`/wallet/${walletName}/auto-id/id`}
                className='block px-4 py-2 hover:bg-gray-200'
              >
                Network: {config.networkId}
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
