import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './Modal'

const meta: Meta<typeof Dialog> = {
  title: 'Astral/Modal',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Dialog>

export const StandardModal: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <button className='bg-blue-600 text-white px-4 py-2 rounded'>Open Modal</button>
      </DialogTrigger>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Standard Modal</DialogTitle>
          <DialogDescription>
            This is a standard modal component with header, content, and footer sections.
          </DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <p>Modal content goes here. You can add any components or text within this area.</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button className='bg-gray-200 text-gray-800 px-4 py-2 rounded mr-2'>Cancel</button>
          </DialogClose>
          <button className='bg-blue-600 text-white px-4 py-2 rounded'>Confirm</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const ControlledModal: Story = {
  render: () => {
    // Use useState to control the open state of the dialog
    const [open, setOpen] = useState(false)

    return (
      <div className='flex flex-col gap-4'>
        <div className='flex gap-2'>
          <button
            onClick={() => setOpen(true)}
            className='bg-blue-600 text-white px-4 py-2 rounded'
          >
            Open Modal
          </button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle>Controlled Modal</DialogTitle>
              <DialogDescription>
                This modal's open/close state is controlled programmatically.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <p>This modal can be opened and closed with external buttons.</p>
              <p className='mt-2'>
                Current state: <strong>{open ? 'Open' : 'Closed'}</strong>
              </p>
            </div>
            <DialogFooter>
              <button
                onClick={() => setOpen(false)}
                className='bg-gray-200 text-gray-800 px-4 py-2 rounded mr-2'
              >
                Close
              </button>
              <button className='bg-blue-600 text-white px-4 py-2 rounded'>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  },
}

export const MultipleControlledModals: Story = {
  render: () => {
    const [firstModalOpen, setFirstModalOpen] = useState(false)
    const [secondModalOpen, setSecondModalOpen] = useState(false)

    const openFirstModal = () => {
      setFirstModalOpen(true)
      setSecondModalOpen(false)
    }

    const openSecondModal = () => {
      setSecondModalOpen(true)
      setFirstModalOpen(false)
    }

    return (
      <div className='flex flex-col gap-4'>
        <div className='flex gap-2'>
          <button onClick={openFirstModal} className='bg-blue-600 text-white px-4 py-2 rounded'>
            Open First Modal
          </button>
          <button onClick={openSecondModal} className='bg-green-600 text-white px-4 py-2 rounded'>
            Open Second Modal
          </button>
        </div>

        <Dialog open={firstModalOpen} onOpenChange={setFirstModalOpen}>
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle>First Modal</DialogTitle>
              <DialogDescription>
                This is the first modal in a multi-modal system.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <p>This modal can be controlled programmatically.</p>
              <button
                onClick={openSecondModal}
                className='bg-green-600 text-white px-4 py-2 rounded mt-4'
              >
                Switch to Second Modal
              </button>
            </div>
            <DialogFooter>
              <button
                onClick={() => setFirstModalOpen(false)}
                className='bg-gray-200 text-gray-800 px-4 py-2 rounded mr-2'
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={secondModalOpen} onOpenChange={setSecondModalOpen}>
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle>Second Modal</DialogTitle>
              <DialogDescription>
                This is the second modal in a multi-modal system.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <p>This modal can be controlled programmatically.</p>
              <button
                onClick={openFirstModal}
                className='bg-blue-600 text-white px-4 py-2 rounded mt-4'
              >
                Switch to First Modal
              </button>
            </div>
            <DialogFooter>
              <button
                onClick={() => setSecondModalOpen(false)}
                className='bg-gray-200 text-gray-800 px-4 py-2 rounded mr-2'
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  },
}

export const AlertModal: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <button className='bg-yellow-500 text-white px-4 py-2 rounded'>Show Alert</button>
      </DialogTrigger>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Alert</DialogTitle>
        </DialogHeader>
        <div className='py-4 flex items-center'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='text-yellow-500 mr-2'
          >
            <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'></path>
            <line x1='12' y1='9' x2='12' y2='13'></line>
            <line x1='12' y1='17' x2='12.01' y2='17'></line>
          </svg>
          <p>This action requires your attention. Please proceed with caution.</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button className='bg-blue-600 text-white px-4 py-2 rounded'>Acknowledge</button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const CustomSizeModal: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <button className='bg-purple-600 text-white px-4 py-2 rounded'>Large Modal</button>
      </DialogTrigger>
      <DialogContent className='max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Large Modal</DialogTitle>
          <DialogDescription>
            This modal uses a custom width for displaying more content.
          </DialogDescription>
        </DialogHeader>
        <div className='py-4 grid grid-cols-2 gap-4'>
          <div className='border p-4 rounded'>
            <h3 className='font-medium mb-2'>Section One</h3>
            <p>
              This is the content for section one of the modal. You can put any information here.
            </p>
          </div>
          <div className='border p-4 rounded'>
            <h3 className='font-medium mb-2'>Section Two</h3>
            <p>
              This is the content for section two of the modal. You can put any information here.
            </p>
          </div>
          <div className='border p-4 rounded'>
            <h3 className='font-medium mb-2'>Section Three</h3>
            <p>
              This is the content for section three of the modal. You can put any information here.
            </p>
          </div>
          <div className='border p-4 rounded'>
            <h3 className='font-medium mb-2'>Section Four</h3>
            <p>
              This is the content for section four of the modal. You can put any information here.
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button className='bg-gray-200 text-gray-800 px-4 py-2 rounded mr-2'>Close</button>
          </DialogClose>
          <button className='bg-purple-600 text-white px-4 py-2 rounded'>Save Changes</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const ImageModal: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <button className='bg-green-600 text-white px-4 py-2 rounded'>View Image</button>
      </DialogTrigger>
      <DialogContent className='max-w-2xl p-0 overflow-hidden'>
        <div className='relative pb-[56.25%] h-0'>
          <img
            src='https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80'
            alt='Landscape'
            className='absolute top-0 left-0 w-full h-full object-cover'
          />
        </div>
        <div className='p-6'>
          <DialogHeader>
            <DialogTitle>Image Viewer</DialogTitle>
            <DialogDescription>A beautiful landscape image from Unsplash.</DialogDescription>
          </DialogHeader>
        </div>
        <DialogClose className='absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground bg-black/20 text-white'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <line x1='18' y1='6' x2='6' y2='18'></line>
            <line x1='6' y1='6' x2='18' y2='18'></line>
          </svg>
          <span className='sr-only'>Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  ),
}
