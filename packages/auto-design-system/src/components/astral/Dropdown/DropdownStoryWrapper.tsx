import React, { FC, ReactNode, useState } from 'react'

export interface DropdownOption {
  id: string | number
  name: string
  icon?: ReactNode
}

interface DropdownWrapperProps {
  options: DropdownOption[]
  value: DropdownOption
  onChange: (value: DropdownOption) => void
  className?: string
  buttonClassName?: string
  optionsClassName?: string
  placeholder?: string
  showIcon?: boolean
}

export const DropdownStoryWrapper: FC<DropdownWrapperProps> = ({
  options,
  value,
  onChange,
  className = '',
  buttonClassName = '',
  optionsClassName = '',
  placeholder = 'Select an option',
  showIcon = true,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`relative mt-1 w-full ${className}`}>
      <button
        className={`relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none dark:bg-gray-800 sm:text-sm ${buttonClassName}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className='flex items-center'>
          {value.icon && showIcon && <span className='mr-2'>{value.icon}</span>}
          <span className='block truncate'>{value.name || placeholder}</span>
          <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
            <svg
              className={`h-5 w-5 text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 20 20'
              fill='currentColor'
              aria-hidden='true'
            >
              <path
                fillRule='evenodd'
                d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
                clipRule='evenodd'
              />
            </svg>
          </span>
        </div>
      </button>

      {isOpen && (
        <div
          className={`absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 sm:text-sm ${optionsClassName}`}
        >
          {options.map((option) => (
            <div
              key={option.id}
              className={`relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 ${
                value.id === option.id ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              onClick={() => {
                onChange(option)
                setIsOpen(false)
              }}
            >
              <div className='flex items-center'>
                {option.icon && showIcon && <span className='mr-2'>{option.icon}</span>}
                <span
                  className={`block truncate ${
                    value.id === option.id ? 'font-medium' : 'font-normal'
                  }`}
                >
                  {option.name}
                </span>
              </div>
              {value.id === option.id && (
                <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400'>
                  <svg
                    className='h-5 w-5'
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                    aria-hidden='true'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
