import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { Dropdown, DropdownOption } from './Dropdown'

// Sample options for the dropdown
const sampleOptions: DropdownOption[] = [
  { id: 1, name: 'Option 1' },
  { id: 2, name: 'Option 2' },
  { id: 3, name: 'Option 3' },
  { id: 4, name: 'Option 4' },
  { id: 5, name: 'Option 5' },
  { id: 6, name: 'Option 6' },
  { id: 7, name: 'Option 7' },
  { id: 8, name: 'Option 8' },
  { id: 9, name: 'Option 9' },
  { id: 10, name: 'Option 10' },
]

const sampleOptionsWithIcons: DropdownOption[] = [
  { id: 1, name: 'Option 1', icon: <span>🔵</span> },
  { id: 2, name: 'Option 2', icon: <span>🟢</span> },
  { id: 3, name: 'Option 3', icon: <span>🟣</span> },
]

const meta: Meta<typeof Dropdown> = {
  title: 'Astral/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Dropdown>

// Default story with state management
export const Default: Story = {
  render: () => {
    const [selectedOption, setSelectedOption] = useState<DropdownOption>(sampleOptions[0])
    return (
      <Dropdown
        options={sampleOptions}
        value={selectedOption}
        onChange={setSelectedOption}
        placeholder='Select an option'
      />
    )
  },
}

// Story with icons
export const WithIcons: Story = {
  render: () => {
    const [selectedOption, setSelectedOption] = useState<DropdownOption>(sampleOptionsWithIcons[0])
    return (
      <Dropdown
        options={sampleOptionsWithIcons}
        value={selectedOption}
        onChange={setSelectedOption}
        showIcon={true}
        placeholder='Select an option with icons'
      />
    )
  },
}

// Story with custom styles
export const WithCustomStyles: Story = {
  render: () => {
    const [selectedOption, setSelectedOption] = useState<DropdownOption>(sampleOptions[0])
    return (
      <Dropdown
        options={sampleOptions}
        value={selectedOption}
        onChange={setSelectedOption}
        className='w-64'
        buttonClassName='bg-blue-50 dark:bg-blue-900'
        optionsClassName='bg-blue-50 dark:bg-blue-900'
        placeholder='Custom styled dropdown'
      />
    )
  },
}
