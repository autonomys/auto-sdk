import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'Astral/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['success', 'warning', 'error', 'info', 'default'],
      description: 'The type/style of the badge',
    },
    children: {
      control: 'text',
      description: 'Content inside the badge',
    },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = {
  args: {
    children: 'Default Badge',
    type: 'default',
  },
}

export const Success: Story = {
  args: {
    children: 'Success Badge',
    type: 'success',
  },
}

export const Warning: Story = {
  args: {
    children: 'Warning Badge',
    type: 'warning',
  },
}

export const Error: Story = {
  args: {
    children: 'Error Badge',
    type: 'error',
  },
}

export const Info: Story = {
  args: {
    children: 'Info Badge',
    type: 'info',
  },
}
