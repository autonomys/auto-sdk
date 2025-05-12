import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { ArrowButton } from './ArrowButton'

const meta: Meta<typeof ArrowButton> = {
  title: 'Astral/Buttons/ArrowButton',
  component: ArrowButton,
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
type Story = StoryObj<typeof ArrowButton>

export const Default: Story = {
  args: {
    children: 'Next Step',
  },
}

export const Small: Story = {
  args: {
    children: 'Small Arrow Button',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    children: 'Large Arrow Button',
    size: 'lg',
  },
}

export const Loading: Story = {
  args: {
    children: 'Loading Arrow Button',
    isLoading: true,
  },
}

export const Disabled: Story = {
  args: {
    children: 'Disabled Arrow Button',
    disabled: true,
  },
}
