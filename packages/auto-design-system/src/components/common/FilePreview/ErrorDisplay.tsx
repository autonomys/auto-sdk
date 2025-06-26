import React from 'react'
import { DirectGatewayLink } from './DirectGatewayLink'

export interface ErrorDisplayProps {
  error: string
  gatewayUrl: string | null
  isAutoDrive?: boolean
  isAstral?: boolean
}

export const ErrorDisplay = ({
  error,
  gatewayUrl,
  isAutoDrive = false,
  isAstral = false,
}: ErrorDisplayProps) => {
  return (
    <div className='rounded-md border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'>
      Error: {error}
      <DirectGatewayLink gatewayUrl={gatewayUrl} isAutoDrive={isAutoDrive} isAstral={isAstral} />
    </div>
  )
}
