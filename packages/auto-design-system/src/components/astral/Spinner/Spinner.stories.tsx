import type { Meta, StoryObj } from '@storybook/react'
import { SimpleSpinner } from './SimpleSpinner'
import { SpinnerSvgStoryWrapper } from './SpinnerSvgStoryWrapper'

// SimpleSpinner stories
const simpleSpinnerMeta: Meta<typeof SimpleSpinner> = {
  title: 'Astral/Spinners/SimpleSpinner',
  component: SimpleSpinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default simpleSpinnerMeta
type SimpleSpinnerStory = StoryObj<typeof SimpleSpinner>

export const Default: SimpleSpinnerStory = {}

// SpinnerSvg stories
const spinnerSvgMeta: Meta<typeof SpinnerSvgStoryWrapper> = {
  title: 'Astral/Spinners/SpinnerSvg',
  component: SpinnerSvgStoryWrapper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the spinner',
    },
  },
}

// Need to export this separately since we can only have one default export
export const spinnerSvgStories = spinnerSvgMeta
type SpinnerSvgStory = StoryObj<typeof SpinnerSvgStoryWrapper>

export const DefaultSpinnerSvg: SpinnerSvgStory = {}

export const LargeSpinnerSvg: SpinnerSvgStory = {
  args: {
    className: 'h-8 w-8 text-blue-500',
  },
}

export const SmallSpinnerSvg: SpinnerSvgStory = {
  args: {
    className: 'h-2 w-2 text-red-500',
  },
}
