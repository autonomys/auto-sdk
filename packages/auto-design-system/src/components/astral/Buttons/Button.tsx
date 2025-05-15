import React, { ButtonHTMLAttributes, FC, ReactNode } from 'react'
import { cn } from '../../../lib/cn'

// Define all the possible variants
export type ButtonVariant =
  | 'primary' // Default blue button
  | 'secondary' // Outline button
  | 'tertiary' // Text only button
  | 'gradient' // Gradient background
  | 'arrow' // Button with arrow
  | 'rounded' // Rounded action button
  | 'copy' // Copy button
  | 'export' // Export button
  | 'wallet' // Connect wallet button

// Define all possible sizes
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  children?: ReactNode
  className?: string
  loadingLabel?: string
  classNameIcon?: string
}

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className,
  loadingLabel = 'Loading...',
  disabled,
  classNameIcon,
  ...rest
}) => {
  // Base styles that apply to all buttons
  const baseStyles =
    'inline-flex items-center justify-center rounded-full font-medium transition-all'

  // Size variations
  const sizeStyles = {
    xs: 'text-xs px-2 py-1',
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  }

  // Variant styles
  const variantStyles = {
    primary:
      'bg-auto-explorer-buttonLightFrom text-white hover:bg-auto-explorer-buttonLightFrom/90 disabled:opacity-70 disabled:cursor-not-allowed dark:bg-auto-explorer-primaryAccent dark:hover:bg-auto-explorer-primaryAccent/90',
    secondary:
      'border border-auto-explorer-buttonLightFrom text-auto-explorer-buttonLightFrom hover:bg-auto-explorer-buttonLightFrom/10 disabled:opacity-70 disabled:cursor-not-allowed',
    tertiary:
      'bg-transparent text-auto-explorer-buttonLightFrom hover:bg-auto-explorer-buttonLightFrom/10 disabled:opacity-70 disabled:cursor-not-allowed',
    gradient:
      'bg-gradient-to-r from-auto-explorer-buttonLightFrom to-auto-explorer-buttonLightTo text-white hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed dark:from-auto-explorer-buttonDarkFrom dark:to-auto-explorer-buttonDarkTo',
    arrow: 'bg-grayDarker text-white text-xs font-light px-5 py-3',
    rounded:
      'bg-white text-gray-800 hover:bg-gray-200 dark:bg-[#1E254E] dark:text-white px-[33px] py-[13px]',
    copy: 'flex gap-2',
    export:
      'bg-auto-explorer-buttonLightFrom text-white dark:bg-auto-explorer-buttonDarkTo max-w-fit',
    wallet:
      'bg-gradient-to-r from-auto-explorer-buttonLightFrom to-auto-explorer-buttonLightTo text-white font-medium dark:bg-auto-explorer-boxDark dark:from-auto-explorer-buttonDarkFrom dark:to-auto-explorer-buttonDarkTo',
  }

  // Width styles
  const widthStyles = fullWidth ? 'w-full' : ''

  // Loading state
  const ButtonContent = () => {
    if (isLoading) {
      return (
        <div className='flex items-center gap-2'>
          <span className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
          {loadingLabel}
        </div>
      )
    }

    return (
      <>
        {leftIcon && <span className={cn('mr-2', classNameIcon)}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={cn('ml-2', classNameIcon)}>{rightIcon}</span>}
      </>
    )
  }

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], widthStyles, className)}
      {...rest}
    >
      <ButtonContent />
    </button>
  )
}
