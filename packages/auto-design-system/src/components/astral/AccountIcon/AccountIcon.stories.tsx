import type { Meta, StoryObj } from '@storybook/react'
import { AccountIconStoryWrapper } from './AccountIconStoryWrapper'

const meta: Meta<typeof AccountIconStoryWrapper> = {
  title: 'Astral/AccountIcon',
  component: AccountIconStoryWrapper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    address: {
      control: 'text',
      description: 'Blockchain address to generate icon for',
    },
    size: {
      control: { type: 'number', min: 16, max: 128, step: 4 },
      description: 'Size of the icon in pixels',
    },
    theme: {
      control: 'select',
      options: ['beachball', 'empty', 'ethereum', 'jdenticon', 'polkadot'],
      description: 'Theme of the identity icon',
    },
    isAlternative: {
      control: 'boolean',
      description: 'Use alternative styling',
    },
    isHighlight: {
      control: 'boolean',
      description: 'Highlight the icon',
    },
  },
}

export default meta
type Story = StoryObj<typeof AccountIconStoryWrapper>

export const Default: Story = {
  args: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    size: 48,
    theme: 'beachball',
  },
}

export const Ethereum: Story = {
  args: {
    address: '0x1234567890123456789012345678901234567890',
    size: 48,
    theme: 'ethereum',
  },
}

export const Small: Story = {
  args: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    size: 24,
  },
}

export const Large: Story = {
  args: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    size: 96,
  },
}

export const Alternative: Story = {
  args: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    isAlternative: true,
  },
}

export const Highlighted: Story = {
  args: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    isHighlight: true,
  },
}
