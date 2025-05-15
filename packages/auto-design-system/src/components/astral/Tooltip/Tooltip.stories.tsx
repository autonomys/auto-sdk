import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { Tooltip } from './Tooltip'

const meta: Meta<typeof Tooltip> = {
  title: 'Astral/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    text: {
      control: 'text',
      description: 'Text content of the tooltip',
    },
    direction: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      description: 'Direction the tooltip should appear',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the tooltip',
    },
  },
}

export default meta
type Story = StoryObj<typeof Tooltip>

export const Default: Story = {
  args: {
    text: 'This is a tooltip with a custom style and a custom direction, and a custom text',
    children: (
      <button className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded'>
        Hover Me
      </button>
    ),
    className: 'max-w-xs',
  },
}

export const Top: Story = {
  args: {
    text: 'Tooltip on top',
    direction: 'top',
    children: (
      <button className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded'>
        Top Tooltip
      </button>
    ),
  },
}

export const Bottom: Story = {
  args: {
    text: 'Tooltip on bottom',
    direction: 'bottom',
    children: (
      <button className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded'>
        Bottom Tooltip
      </button>
    ),
  },
}

export const Left: Story = {
  args: {
    text: 'Tooltip on left',
    direction: 'left',
    children: (
      <button className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded'>
        Left Tooltip
      </button>
    ),
  },
}

export const Right: Story = {
  args: {
    text: 'Tooltip on right',
    direction: 'right',
    children: (
      <button className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded'>
        Right Tooltip
      </button>
    ),
  },
}

export const WithCustomStyle: Story = {
  args: {
    text: 'Custom styled tooltip',
    className: 'bg-green-600 text-white font-bold',
    children: (
      <button className='bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded'>
        Custom Style
      </button>
    ),
  },
}

export const WithRichContent: Story = {
  args: {
    text: (
      <div className='flex flex-col gap-2'>
        <span className='font-bold'>Rich Content</span>
        <span>You can include any React element here</span>
        <div className='h-1 w-full bg-white/20' />
        <span className='text-xs'>Learn more</span>
      </div>
    ),
    children: (
      <button className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded'>
        Rich Content
      </button>
    ),
  },
}
