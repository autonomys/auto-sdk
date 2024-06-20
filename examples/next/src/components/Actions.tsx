'use client'

import { actions } from '@/constants/actions'
import { useWalletsStates } from '@/states/wallets'
import { FC, useCallback, useMemo, useState } from 'react'

export const Actions: FC = () => {
  const { selectedAction, setSelectedAction } = useWalletsStates()
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = useCallback((action: (typeof actions)[0]) => {
    setSelectedAction(action)
    setIsOpen(false)
  }, [])

  const actionSelection = useMemo(
    () =>
      actions.map((action, index) => (
        <div
          key={index}
          className='p-4 cursor-pointer text-white hover:bg-white hover:bg-opacity-10 rounded-md'
          onClick={() => handleSelect(action)}
        >
          {action.name}
        </div>
      )),
    [actions, handleSelect],
  )

  return (
    <div className='relative pt-4'>
      <button
        className='w-full bg-transparent border border-white text-white font-mono font-bold p-4 rounded-lg shadow-md'
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedAction ? (
          <>
            Action: <b>{selectedAction.name}</b>
          </>
        ) : (
          <>Select an action</>
        )}
      </button>
      {isOpen && (
        <div className='absolute mt-2 w-full bg-[rgba(0,0,0,0.4)] border border-white rounded-lg shadow-lg'>
          {actionSelection}
        </div>
      )}
    </div>
  )
}
