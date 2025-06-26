import React from 'react'
import { cn } from '../../../utils/cn'

export interface LoadingSpinnerProps {
  isAutoDrive?: boolean
  isAstral?: boolean
}

export const LoadingSpinner = ({ isAutoDrive = false, isAstral = false }: LoadingSpinnerProps) => {
  return (
    <div className='flex h-[50vh] items-center justify-center'>
      <div
        className={cn(
          'h-12 w-12 animate-spin rounded-full border-b-2',
          isAutoDrive && 'border-auto-drive-accent dark:border-auto-drive-accent',
          isAstral && 'border-auto-explorer-primaryAccent dark:border-auto-explorer-primaryAccent',
        )}
      ></div>
    </div>
  )
}
