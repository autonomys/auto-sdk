import { LockClosedIcon } from '@heroicons/react/24/outline'
import React from 'react'
import { cn } from '../../../utils/cn'

export interface EncryptedFilePromptProps {
  isAutoDrive?: boolean
  isAstral?: boolean
  onDecryptClick: () => void
}

export const EncryptedFilePrompt = ({
  isAutoDrive = false,
  isAstral = false,
  onDecryptClick,
}: EncryptedFilePromptProps) => {
  return (
    <div className='flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800'>
      <div className='flex items-center mb-4'>
        <LockClosedIcon className='mr-2 h-6 w-6 text-auto-explorer-primaryAccent' />
        <p className='text-sm font-normal text-gray-900 dark:text-white'>
          No preview due to the file being encrypted.
        </p>
      </div>
      <button
        onClick={onDecryptClick}
        className={cn(
          'rounded-lg px-4 py-2.5 text-xs font-semibold text-white',
          isAutoDrive &&
            'bg-auto-drive-accent hover:bg-auto-drive-accent/90 dark:bg-auto-drive-accent dark:hover:bg-auto-drive-accent/90',
          isAstral &&
            'bg-auto-explorer-buttonLightFrom hover:bg-auto-explorer-buttonLightFrom/90 dark:bg-auto-explorer-buttonDarkFrom dark:hover:bg-auto-explorer-buttonDarkFrom/90',
        )}
      >
        Decrypt File
      </button>
    </div>
  )
}
