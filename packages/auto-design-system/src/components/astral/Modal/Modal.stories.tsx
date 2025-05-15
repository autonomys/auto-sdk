import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { ModalStoryWrapper } from './ModalStoryWrapper'

// Wrapper component for interactive stories
type ModalWrapperProps = {
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
  className?: string
  contentClassName?: string
  overlayClassName?: string
  showTitle?: boolean
  showCloseButton?: boolean
  titleClassName?: string
  closeButtonClassName?: string
  initialOpen?: boolean
}

const ModalWrapper = (props: ModalWrapperProps) => {
  const { initialOpen = true, ...modalProps } = props
  const [isOpen, setIsOpen] = useState(initialOpen)

  return (
    <div className='text-center'>
      <button onClick={() => setIsOpen(true)} className='bg-blue-600 text-white px-4 py-2 rounded'>
        Open Modal
      </button>

      <ModalStoryWrapper {...modalProps} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  )
}

const meta: Meta<typeof ModalWrapper> = {
  title: 'Astral/Modal',
  component: ModalWrapper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Title of the modal',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
      description: 'Size of the modal',
    },
    showTitle: {
      control: 'boolean',
      description: 'Whether to show the title',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Whether to show the close button',
    },
    initialOpen: {
      control: 'boolean',
      description: 'Whether the modal is initially open',
    },
  },
}

export default meta
type Story = StoryObj<typeof ModalWrapper>

export const Default: Story = {
  args: {
    title: 'Default Modal',
    children: <div className='p-4'>This is a default modal</div>,
    size: 'md',
    initialOpen: true,
  },
}

export const Small: Story = {
  args: {
    title: 'Small Modal',
    children: <div className='p-4'>This is a small modal</div>,
    size: 'sm',
    initialOpen: true,
  },
}

export const Large: Story = {
  args: {
    title: 'Large Modal',
    children: <div className='p-4'>This is a large modal</div>,
    size: 'lg',
    initialOpen: true,
  },
}

export const NoTitle: Story = {
  args: {
    showTitle: false,
    children: <div className='p-4'>This modal has no title</div>,
    size: 'md',
    initialOpen: true,
  },
}

export const NoCloseButton: Story = {
  args: {
    title: 'No Close Button',
    showCloseButton: false,
    children: <div className='p-4'>This modal has no close button</div>,
    size: 'md',
    initialOpen: true,
  },
}

export const CustomStyles: Story = {
  args: {
    title: 'Custom Styled Modal',
    contentClassName: 'bg-blue-50 dark:bg-blue-900',
    titleClassName: 'text-green-600 dark:text-green-400',
    children: <div className='p-4'>This modal has custom styles</div>,
    size: 'md',
    initialOpen: true,
  },
}
