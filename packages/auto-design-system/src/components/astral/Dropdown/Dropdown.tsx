'use client'

import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons'
import * as SelectPrimitive from '@radix-ui/react-select'
import React, { FC, forwardRef, ReactNode } from 'react'
import { cn } from '../../../utils/cn'

export interface DropdownOption {
  id: string | number
  name: string
  icon?: ReactNode
}

interface DropdownProps {
  options: DropdownOption[]
  value: DropdownOption
  onChange: (value: DropdownOption) => void
  className?: string
  buttonClassName?: string
  optionsClassName?: string
  placeholder?: string
  showIcon?: boolean
}

const Select = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value

const SelectTrigger = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { showIcon?: boolean }
>(({ className, children, showIcon = true, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-boxDark',
      className,
    )}
    {...props}
  >
    {children}
    {showIcon && (
      <SelectPrimitive.Icon asChild>
        <CaretSortIcon className='h-4 w-4 opacity-50' />
      </SelectPrimitive.Icon>
    )}
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:bg-auto-explorer-boxDark dark:text-white',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectItem = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    icon?: ReactNode
    showIcon?: boolean
  }
>(({ className, children, icon, showIcon = true, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700',
      className,
    )}
    {...props}
  >
    <span className='absolute left-2 flex h-3.5 w-3.5 items-center justify-center'>
      <SelectPrimitive.ItemIndicator>
        <CheckIcon className='h-4 w-4 text-auto-explorer-blueAccent dark:text-auto-explorer-blueLight' />
      </SelectPrimitive.ItemIndicator>
    </span>
    <div className='flex items-center'>
      {icon && showIcon && <span className='mr-2'>{icon}</span>}
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </div>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

export const Dropdown: FC<DropdownProps> = ({
  options,
  value,
  onChange,
  className,
  buttonClassName,
  optionsClassName,
  placeholder = 'Select an option',
  showIcon = true,
}) => {
  const handleValueChange = (selectedValueId: string) => {
    const selectedOption = options.find((option) => option.id.toString() === selectedValueId)
    if (selectedOption) {
      onChange(selectedOption)
    }
  }

  return (
    <div className={className}>
      <Select value={value.id.toString()} onValueChange={handleValueChange}>
        <SelectTrigger className={cn('w-full', buttonClassName)} showIcon={showIcon}>
          <div className='flex items-center'>
            {value.icon && showIcon && <span className='mr-2'>{value.icon}</span>}
            <SelectValue placeholder={placeholder}>{value.name || placeholder}</SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className={cn('max-h-60', optionsClassName)}>
          {options.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id.toString()}
              icon={option.icon}
              showIcon={showIcon}
            >
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
