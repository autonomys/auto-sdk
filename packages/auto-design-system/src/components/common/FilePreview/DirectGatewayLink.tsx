import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import React from 'react'
import { cn } from '../../../utils/cn'

export interface DirectGatewayLinkProps {
  gatewayUrl: string | null
  isEncrypted?: boolean
  isAutoDrive?: boolean
  isAstral?: boolean
}

export const DirectGatewayLink = ({
  gatewayUrl,
  isEncrypted = false,
  isAutoDrive = false,
  isAstral = false,
}: DirectGatewayLinkProps) => {
  if (!gatewayUrl || isEncrypted) {
    return null
  }

  return (
    <div className='mt-2 flex justify-end text-sm'>
      <a
        href={gatewayUrl}
        target='_blank'
        rel='noopener noreferrer'
        className={cn(
          'flex items-center hover:underline',
          isAutoDrive && 'text-auto-drive-accent dark:text-auto-drive-accent',
          isAstral && 'text-auto-explorer-primaryAccent dark:text-auto-explorer-primaryAccent',
        )}
      >
        <ArrowTopRightOnSquareIcon className='mr-1 h-4 w-4' />
        View on gateway
      </a>
    </div>
  )
}
