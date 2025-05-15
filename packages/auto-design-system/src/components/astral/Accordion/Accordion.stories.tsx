import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { Accordion } from './Accordion'

const meta: Meta<typeof Accordion> = {
  title: 'Astral/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'The title of the accordion',
    },
    defaultOpen: {
      control: 'boolean',
      description: 'Whether the accordion is open by default',
    },
    value: {
      control: 'text',
      description: 'Optional value to display next to the title',
    },
  },
}

export default meta
type Story = StoryObj<typeof Accordion>

export const Default: Story = {
  args: {
    title: 'Accordion Title',
    children: <div className='p-4'>Accordion content goes here</div>,
    defaultOpen: false,
  },
}

export const OpenByDefault: Story = {
  args: {
    title: 'Open Accordion',
    children: <div className='p-4'>This accordion is open by default</div>,
    defaultOpen: true,
  },
}

export const WithValue: Story = {
  args: {
    title: 'Accordion with Value',
    value: '42',
    children: <div className='p-4'>Accordion with a value displayed next to the title</div>,
  },
}

export const WithCustomIcon: Story = {
  args: {
    title: 'Custom Icon Accordion',
    icon: <span>🔍</span>,
    children: (
      <div className='p-4'>Accordion with a custom icon instead of the default chevron</div>
    ),
  },
}
