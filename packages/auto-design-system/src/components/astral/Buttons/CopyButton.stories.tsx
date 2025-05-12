import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { CopyButton } from './CopyButton'

const meta: Meta<typeof CopyButton> = {
  title: 'Astral/Buttons/CopyButton',
  component: CopyButton,
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
type Story = StoryObj<typeof CopyButton>

export const Default: Story = {
  args: {
    children: 'Copy Text',
    value: 'This text has been copied to clipboard',
  },
}

export const WithCustomMessage: Story = {
  args: {
    children: 'Copy Address',
    value: '0x1234567890abcdef1234567890abcdef12345678',
    message: 'Address copied to clipboard!',
  },
}

export const Small: Story = {
  args: {
    children: 'Copy',
    value: 'Small button text',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    children: 'Copy Content',
    value: 'Large button text',
    size: 'lg',
  },
}

export const CustomIconClass: Story = {
  args: {
    children: 'Copy with Custom Icon',
    value: 'Text with custom icon size',
    iconClass: 'w-5 h-5',
  },
}

export const Disabled: Story = {
  args: {
    children: 'Disabled Copy Button',
    value: 'This text cannot be copied',
    disabled: true,
  },
}
