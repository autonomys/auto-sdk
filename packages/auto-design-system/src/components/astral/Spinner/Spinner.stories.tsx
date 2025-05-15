import type { Meta, StoryObj } from '@storybook/react'
import { SimpleSpinner } from './SimpleSpinner'
import { SpinnerSvg } from './SpinnerSvg'

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
const spinnerSvgMeta: Meta<typeof SpinnerSvg> = {
  title: 'Astral/Spinners/SpinnerSvg',
  component: SpinnerSvg,
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
type SpinnerSvgStory = StoryObj<typeof SpinnerSvg>

export const DefaultSpinnerSvg: SpinnerSvgStory = {}
