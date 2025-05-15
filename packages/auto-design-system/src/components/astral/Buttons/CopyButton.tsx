import { Check, Copy } from 'lucide-react'
import React, { FC, useState } from 'react'
import { cn } from '../../../lib/cn'
import { Button, ButtonProps } from './Button'

interface CopyButtonProps extends Omit<ButtonProps, 'variant'> {
  value: string
  message?: string
  iconClass?: string
  tooltipText?: string
  className?: string
}

export const CopyButton: FC<CopyButtonProps> = ({
  value,
  children,
  iconClass = 'w-4 h-4',
  tooltipText = 'Copy to clipboard',
  className,
  ...rest
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopyClick = (): void => {
    try {
      navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  return (
    <div className={cn('relative group', className)}>
      <Button
        variant='copy'
        onClick={handleCopyClick}
        rightIcon={
          <div className='relative group/icon'>
            {copied ? (
              <Check className={cn(iconClass, 'text-green-500')} />
            ) : (
              <Copy className={iconClass} />
            )}
            <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none'>
              {copied ? 'Copied!' : tooltipText}
            </div>
          </div>
        }
        {...rest}
        className={className}
        classNameIcon='ml-2'
      >
        {children}
      </Button>
    </div>
  )
}
