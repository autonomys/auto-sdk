import type { Meta, StoryObj } from '@storybook/react'
import { StatusIcon } from './StatusIcon'

const meta: Meta<typeof StatusIcon> = {
  title: 'Astral/StatusIcon',
  component: StatusIcon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'boolean',
      description: 'The status to display (true for success, false for error)',
    },
    isPending: {
      control: 'boolean',
      description: 'Whether the status is pending',
    },
  },
}

export default meta
type Story = StoryObj<typeof StatusIcon>

export const Success: Story = {
  args: {
    status: true,
    isPending: false,
  },
}

export const Error: Story = {
  args: {
    status: false,
    isPending: false,
  },
}

export const Pending: Story = {
  args: {
    status: false,
    isPending: true,
  },
}
