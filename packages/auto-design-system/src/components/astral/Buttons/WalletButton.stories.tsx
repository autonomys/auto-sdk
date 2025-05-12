import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { WalletButton } from './WalletButton'

const meta: Meta<typeof WalletButton> = {
  title: 'Astral/Buttons/WalletButton',
  component: WalletButton,
  parameters: {
    layout: 'centered',
    viewport: {
      defaultViewport: 'desktop',
    },
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
  },
}

export default meta
type Story = StoryObj<typeof WalletButton>

export const Desktop: Story = {
  args: {
    onConnectWallet: () => console.log('Wallet connect clicked'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
}

export const Mobile: Story = {
  args: {
    onConnectWallet: () => console.log('Wallet connect clicked on mobile'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
}

export const Loading: Story = {
  args: {
    onConnectWallet: () => console.log('Wallet connect clicked'),
    isLoading: true,
  },
}

export const Small: Story = {
  args: {
    onConnectWallet: () => console.log('Wallet connect clicked'),
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    onConnectWallet: () => console.log('Wallet connect clicked'),
    size: 'lg',
  },
}

export const Disabled: Story = {
  args: {
    onConnectWallet: () => console.log('Wallet connect clicked'),
    disabled: true,
  },
}
