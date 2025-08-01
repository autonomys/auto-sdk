import React from 'react'
import { cn } from '../../../utils/cn'
import { DirectGatewayLink } from './DirectGatewayLink'

export interface DecryptionErrorDisplayProps {
  decryptionError: string
  gatewayUrl: string | null
  isAutoDrive?: boolean
  isAstral?: boolean
  onRetry: () => void
}

export const DecryptionErrorDisplay = ({
  decryptionError,
  gatewayUrl,
  isAutoDrive = false,
  isAstral = false,
  onRetry,
}: DecryptionErrorDisplayProps) => {
  return (
    <div className='rounded-md border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'>
      Decryption Error: {decryptionError}
      <button
        onClick={onRetry}
        className={cn(
          'mt-2 rounded-lg px-4 py-2 text-sm font-semibold text-white',
          isAutoDrive &&
            'bg-auto-drive-accent hover:bg-auto-drive-accent/90 dark:bg-auto-drive-accent dark:hover:bg-auto-drive-accent/90',
          isAstral &&
            'bg-auto-explorer-primaryAccent hover:bg-auto-explorer-primaryAccent/90 dark:bg-auto-explorer-primaryAccent dark:hover:bg-auto-explorer-primaryAccent/90',
        )}
      >
        Try Again
      </button>
      <DirectGatewayLink gatewayUrl={gatewayUrl} isAutoDrive={isAutoDrive} isAstral={isAstral} />
    </div>
  )
}
