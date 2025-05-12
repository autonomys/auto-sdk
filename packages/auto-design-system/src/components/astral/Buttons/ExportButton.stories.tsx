import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { ExportButton } from './ExportButton'

// Sample data for demonstration
const mockData = [
  { id: 1, name: 'Item 1', value: 100 },
  { id: 2, name: 'Item 2', value: 200 },
  { id: 3, name: 'Item 3', value: 300 },
]

const meta: Meta<typeof ExportButton> = {
  title: 'Astral/Buttons/ExportButton',
  component: ExportButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
    isLoading: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof ExportButton>

export const Default: Story = {
  args: {
    data: mockData,
    filename: 'export-demo',
  },
}

export const WithCustomLabel: Story = {
  args: {
    data: mockData,
    filename: 'custom-export',
    children: 'Export to Excel',
  },
}

export const Small: Story = {
  args: {
    data: mockData,
    filename: 'small-export',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    data: mockData,
    filename: 'large-export',
    size: 'lg',
  },
}

export const Disabled: Story = {
  args: {
    data: mockData,
    filename: 'disabled-export',
    disabled: true,
  },
}
