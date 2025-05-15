import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { Toggle } from './Toggle'

// Interactive wrapper component to handle state
type ToggleWrapperProps = {
  initialChecked?: boolean
  name?: string
  className?: string
}

const ToggleWrapper = ({ initialChecked = false, name, className }: ToggleWrapperProps) => {
  const [checked, setChecked] = useState(initialChecked)

  return (
    <div className='flex flex-col items-center gap-2'>
      <Toggle checked={checked} onChange={setChecked} name={name} className={className} />
      <div className='mt-4 text-sm'>Status: {checked ? 'On' : 'Off'}</div>
    </div>
  )
}

const meta: Meta<typeof ToggleWrapper> = {
  title: 'Astral/Toggle',
  component: ToggleWrapper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    initialChecked: {
      control: 'boolean',
      description: 'Initial checked state of the toggle',
    },
    name: {
      control: 'text',
      description: 'Name attribute for the toggle input',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the toggle',
    },
  },
}

export default meta
type Story = StoryObj<typeof ToggleWrapper>

export const Default: Story = {
  args: {
    initialChecked: false,
  },
}

export const InitiallyOn: Story = {
  args: {
    initialChecked: true,
  },
}

export const WithName: Story = {
  args: {
    initialChecked: false,
    name: 'toggle-example',
  },
}

export const WithCustomClass: Story = {
  args: {
    initialChecked: false,
    className: 'w-14 h-7',
  },
}
