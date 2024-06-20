'use client'

import { wallets } from '@/constants/wallets'
import { FC, useCallback, useState } from 'react'

export const WalletDropdown: FC = () => {
  const [selectedOption, setSelectedOption] = useState(wallets[0])
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = useCallback((option: (typeof wallets)[0]) => {
    console.log('option', option)
    setSelectedOption(option)
    // setIsOpen(false)
  }, [])

  const handleClick = useCallback(() => {
    setIsOpen(!isOpen)
  }, [isOpen])
  console.log('isOpen', isOpen, wallets)

  return (
    <div className='relative'>
      <button
        className='w-full bg-transparent border border-white text-white font-mono font-bold p-4 rounded-lg shadow-md'
        onClick={handleClick}
      >
        Wallet: <b>{selectedOption.name}</b> bob
      </button>
      {isOpen && (
        <div className='absolute mt-2 w-full bg-[rgba(0,0,0,0.4)] border border-white rounded-lg shadow-lg'>
          {wallets.map((option, index) => (
            <div
              key={index}
              className='p-4 cursor-pointer text-white hover:bg-white hover:bg-opacity-10 rounded-md'
              onClick={() => handleSelect(option)}
            >
              {option.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
