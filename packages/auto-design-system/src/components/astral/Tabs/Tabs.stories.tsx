import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { TabSimple, TabsStoryWrapper } from './TabsStoryWrapper'

const TabsDemo = () => {
  return (
    <TabsStoryWrapper>
      <TabSimple title='Tab 1'>
        <div className='p-4'>Tab 1 Content</div>
      </TabSimple>
      <TabSimple title='Tab 2'>
        <div className='p-4'>Tab 2 Content</div>
      </TabSimple>
      <TabSimple title='Tab 3'>
        <div className='p-4'>Tab 3 Content</div>
      </TabSimple>
    </TabsStoryWrapper>
  )
}

const TabsWithIdDemo = () => {
  return (
    <TabsStoryWrapper>
      <TabSimple id='tab1' title='Tab 1'>
        <div className='p-4'>Tab 1 Content</div>
      </TabSimple>
      <TabSimple id='tab2' title='Tab 2'>
        <div className='p-4'>Tab 2 Content</div>
      </TabSimple>
      <TabSimple id='tab3' title='Tab 3'>
        <div className='p-4'>Tab 3 Content</div>
      </TabSimple>
    </TabsStoryWrapper>
  )
}

const TabsWithCustomStylesDemo = () => {
  return (
    <TabsStoryWrapper
      tabStyle='bg-blue-50 dark:bg-blue-900 border border-blue-200 shadow rounded-lg p-4'
      pillStyle='text-blue-600 bg-white dark:bg-transparent dark:text-blue-200'
      activePillStyle='text-white bg-blue-600 dark:bg-blue-500'
    >
      <TabSimple title='Tab 1'>
        <div className='p-4'>Tab 1 Content</div>
      </TabSimple>
      <TabSimple title='Tab 2'>
        <div className='p-4'>Tab 2 Content</div>
      </TabSimple>
      <TabSimple title='Tab 3'>
        <div className='p-4'>Tab 3 Content</div>
      </TabSimple>
    </TabsStoryWrapper>
  )
}

const meta: Meta<typeof TabsDemo> = {
  title: 'Astral/Tabs',
  component: TabsDemo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TabsDemo>

export const Default: Story = {}

export const WithIds: Story = {
  render: () => <TabsWithIdDemo />,
}

export const WithCustomStyles: Story = {
  render: () => <TabsWithCustomStylesDemo />,
}
