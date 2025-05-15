import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { DropdownOption, DropdownStoryWrapper } from './DropdownStoryWrapper'

// Sample options for the dropdown
const sampleOptions: DropdownOption[] = [
  { id: 1, name: 'Option 1' },
  { id: 2, name: 'Option 2' },
  { id: 3, name: 'Option 3' },
]

const sampleOptionsWithIcons: DropdownOption[] = [
  { id: 1, name: 'Option 1', icon: <span>🔵</span> },
  { id: 2, name: 'Option 2', icon: <span>🟢</span> },
  { id: 3, name: 'Option 3', icon: <span>🟣</span> },
]

// Create a proper type for the DropdownWrapper props
type DropdownWrapperProps = {
  options: DropdownOption[]
  value?: DropdownOption
  placeholder?: string
  showIcon?: boolean
  className?: string
  buttonClassName?: string
  optionsClassName?: string
}

// Wrapper component for interactive stories
const DropdownWrapper = (props: DropdownWrapperProps) => {
  const [selectedOption, setSelectedOption] = useState(props.value || sampleOptions[0])
  return (
    <DropdownStoryWrapper
      {...props}
      value={selectedOption}
      onChange={(option) => setSelectedOption(option)}
    />
  )
}

const meta: Meta<typeof DropdownStoryWrapper> = {
  title: 'Astral/Dropdown',
  component: DropdownWrapper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when no option is selected',
    },
    showIcon: {
      control: 'boolean',
      description: 'Whether to show icons in the dropdown options',
    },
  },
}

export default meta
type Story = StoryObj<typeof DropdownWrapper>

export const Default: Story = {
  args: {
    options: sampleOptions,
    value: sampleOptions[0],
  },
}

export const WithIcons: Story = {
  args: {
    options: sampleOptionsWithIcons,
    value: sampleOptionsWithIcons[0],
    showIcon: true,
  },
}

export const WithCustomStyles: Story = {
  args: {
    options: sampleOptions,
    value: sampleOptions[0],
    className: 'w-64',
    buttonClassName: 'bg-blue-50 dark:bg-blue-900',
    optionsClassName: 'bg-blue-50 dark:bg-blue-900',
  },
}
