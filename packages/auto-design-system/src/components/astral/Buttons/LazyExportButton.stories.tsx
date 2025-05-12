import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { LazyExportButton } from './LazyExportButton'

// Sample async data fetching function
const mockQuery = async () => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  return [
    { id: 1, name: 'Item 1', value: 100 },
    { id: 2, name: 'Item 2', value: 200 },
    { id: 3, name: 'Item 3', value: 300 },
    { id: 4, name: 'Item 4', value: 400 },
    { id: 5, name: 'Item 5', value: 500 },
  ]
}

// Sample error function
const mockErrorQuery = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  throw new Error('Failed to fetch data')
}

const meta: Meta<typeof LazyExportButton> = {
  title: 'Astral/Buttons/LazyExportButton',
  component: LazyExportButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
    fullWidth: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof LazyExportButton>

export const Default: Story = {
  args: {
    query: mockQuery,
    filename: 'lazy-export-demo',
  },
}

export const WithCustomLabel: Story = {
  args: {
    query: mockQuery,
    filename: 'custom-lazy-export',
    children: 'Export Full Data',
  },
}

export const Small: Story = {
  args: {
    query: mockQuery,
    filename: 'small-lazy-export',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    query: mockQuery,
    filename: 'large-lazy-export',
    size: 'lg',
  },
}

export const WithError: Story = {
  args: {
    query: mockErrorQuery,
    filename: 'error-lazy-export',
  },
}

export const Disabled: Story = {
  args: {
    query: mockQuery,
    filename: 'disabled-lazy-export',
    disabled: true,
  },
}
