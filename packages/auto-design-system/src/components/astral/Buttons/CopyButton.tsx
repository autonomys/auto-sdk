import React, { FC } from 'react'
import { Button, ButtonProps } from './Button'

interface CopyButtonProps extends Omit<ButtonProps, 'variant'> {
  value: string
  message?: string
  iconClass?: string
}

// Custom copy icon component
const CopyIcon: FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='#1949D2'
    strokeWidth='1.5'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <rect x='8' y='8' width='12' height='12' rx='2'></rect>
    <path d='M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2'></path>
  </svg>
)

export const CopyButton: FC<CopyButtonProps> = ({
  value,
  children,
  message = 'Copied',
  iconClass = 'w-4 h-4',
  ...rest
}) => {
  const handleCopyClick = (): void => {
    try {
      navigator.clipboard.writeText(value)
      // toast.success(message, {
      //   position: 'bottom-center',
      // })
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  return (
    <Button
      variant='copy'
      onClick={handleCopyClick}
      rightIcon={<CopyIcon className={iconClass} />}
      {...rest}
    >
      {children}
    </Button>
  )
}
