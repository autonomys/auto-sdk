'use client'

import { useWalletsStates } from '@/states/wallets'
import { FC, useCallback, useState } from 'react'

export const ActionBody: FC = () => {
  const { selectedAction, setSelectedAction } = useWalletsStates()
  const [isOpen, setIsOpen] = useState(false)

  if (selectedAction === null) return <div className='height-full' />

  return (
    <div className='relative height-full'>
      <button
        className='w-full bg-transparent border border-white text-white font-mono font-bold p-4 rounded-lg shadow-md'
        onClick={() => setIsOpen(!isOpen)}
      >
        Action: <b>{selectedAction.name}</b>
      </button>
      {isOpen && (
        <div className='absolute mt-2 w-full bg-[rgba(0,0,0,0.4)] border border-white rounded-lg shadow-lg'>
          Hello world
        </div>
      )}
    </div>
  )
}
