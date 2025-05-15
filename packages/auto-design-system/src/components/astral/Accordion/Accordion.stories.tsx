import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './Accordion'

const meta: Meta<typeof Accordion> = {
  title: 'Astral/Accordion',
  component: Accordion,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['single', 'multiple'],
      description: 'The accordion type (single or multiple)',
    },
    defaultValue: {
      control: 'text',
      description: 'The default opened item value(s)',
    },
  },
}

export default meta
type Story = StoryObj<typeof Accordion>

export const Default: Story = {
  render: () => (
    <Accordion type='single' collapsible>
      <AccordionItem value='item-1'>
        <AccordionTrigger className='hover:no-underline'>Accordion Title</AccordionTrigger>
        <AccordionContent>
          <div className='p-4'>Accordion content goes here</div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const OpenByDefault: Story = {
  render: () => (
    <div className='p-4 max-w-xl mx-auto'>
      <Accordion type='single' defaultValue='item-1' collapsible className='w-full'>
        <AccordionItem value='item-1'>
          <AccordionTrigger>Open Accordion</AccordionTrigger>
          <AccordionContent>
            <div className='p-4'>This accordion is open by default</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}

export const Multiple: Story = {
  render: () => (
    <div className='p-4 max-w-xl mx-auto'>
      <Accordion type='multiple' defaultValue={['item-1']} className='w-full'>
        <AccordionItem value='item-1'>
          <AccordionTrigger>First Accordion Item</AccordionTrigger>
          <AccordionContent>
            <div className='p-4'>First accordion content</div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-2'>
          <AccordionTrigger>Second Accordion Item</AccordionTrigger>
          <AccordionContent>
            <div className='p-4'>Second accordion content</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}

export const WithCustomTrigger: Story = {
  render: () => (
    <div className='p-4 max-w-xl mx-auto'>
      <Accordion type='single' collapsible className='w-full'>
        <AccordionItem value='item-1'>
          <AccordionTrigger>
            <div className='flex justify-between w-full'>
              <span>Accordion with Value</span>
              <span className='text-muted-foreground'>42</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className='p-4'>Accordion with a value displayed next to the title</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}
