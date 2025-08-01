import { Switch } from '@headlessui/react'
import React, { FC } from 'react'
import { cn } from '../../../utils/cn'
interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  name?: string
  className?: string
}

export const Toggle: FC<ToggleProps> = ({ checked, onChange, name, className }) => {
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      name={name}
      className={cn(
        className,
        checked
          ? 'bg-auto-explorer-buttonLightFrom dark:bg-auto-explorer-primaryAccent'
          : 'bg-gray-200 dark:bg-gray-700',
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-auto-explorer-primaryAccent focus:ring-offset-2',
      )}
    >
      <span
        className={cn(
          checked ? 'translate-x-6' : 'translate-x-1',
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
        )}
      />
    </Switch>
  )
}
