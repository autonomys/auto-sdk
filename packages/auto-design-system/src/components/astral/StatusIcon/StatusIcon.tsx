import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline'
import React, { FC } from 'react'

type StatusIconProps = {
  status: boolean
  isPending?: boolean
}

export const StatusIcon: FC<StatusIconProps> = ({ status, isPending }) => {
  if (isPending) return <ClockIcon className='size-5' stroke='orange' />
  return status ? (
    <CheckCircleIcon className='size-5' stroke='#37D058' />
  ) : (
    <XCircleIcon className='size-5' stroke='#D70040' />
  )
}
