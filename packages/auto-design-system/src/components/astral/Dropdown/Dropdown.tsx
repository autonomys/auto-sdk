'use client'

import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { FC, Fragment, ReactNode } from 'react'
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
  return (
    <Listbox value={value} onChange={onChange}>
      <div className={cn('relative mt-1 w-full', className)}>
        <Listbox.Button
          className={cn(
            'relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 dark:bg-boxDark sm:text-sm',
            buttonClassName,
          )}
        >
          <div className='flex items-center'>
            {value.icon && showIcon && <span className='mr-2'>{value.icon}</span>}
            <span className='block truncate'>{value.name || placeholder}</span>
            <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
              <ChevronDownIcon
                className='size-5 text-gray-400 ui-open:rotate-180'
                aria-hidden='true'
              />
            </span>
          </div>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave='transition ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <Listbox.Options
            className={cn(
              'absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-auto-explorer-boxDark sm:text-sm',
              optionsClassName,
            )}
          >
            {options.map((option) => (
              <Listbox.Option
                key={option.id}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900 dark:text-white ${
                    active && 'bg-gray-100 dark:bg-gray-700'
                  }`
                }
                value={option}
              >
                {({ selected }) => (
                  <>
                    <div className='flex items-center'>
                      {option.icon && showIcon && <span className='mr-2'>{option.icon}</span>}
                      <span
                        className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}
                      >
                        {option.name}
                      </span>
                    </div>
                    {selected ? (
                      <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-auto-explorer-blueAccent dark:text-auto-explorer-blueLight'>
                        <CheckIcon className='size-5' aria-hidden='true' />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}
