import type { Meta, StoryObj } from '@storybook/react'
import { AccountIconWithLink } from './AccountIcon'

const meta: Meta<typeof AccountIconWithLink> = {
  title: 'Astral/AccountIconWithLink',
  component: AccountIconWithLink,
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
    className: {
      control: 'text',
      description: 'Additional CSS class name',
    },
    isCopyable: {
      control: 'boolean',
      description: 'Show copy button',
    },
  },
}

export default meta
type Story = StoryObj<typeof AccountIconWithLink>

export const Default: Story = {
  args: {
    address: 'sucGPHK3b4REe2DNRvNaUrmcoXVDDZVasm7zBNtev4zUpLrp4',
    size: 24,
    theme: 'beachball',
    link: 'https://explorer.autonomys.xyz/mainnet/consensus/accounts/sucGPHK3b4REe2DNRvNaUrmcoXVDDZVasm7zBNtev4zUpLrp4',
    isCopyable: true,
  },
}

export const Ethereum: Story = {
  args: {
    address: '0x1234567890123456789012345678901234567890',
    size: 48,
    theme: 'ethereum',
    link: 'https://explorer.autonomys.xyz/mainnet/consensus/accounts/0x1234567890123456789012345678901234567890',
    isCopyable: true,
  },
}

export const Polkadot: Story = {
  args: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    size: 24,
    theme: 'polkadot',
    isCopyable: true,
  },
}

export const Jdenticon: Story = {
  args: {
    address: '0x1234567890123456789012345678901234567890',
    size: 48,
    theme: 'jdenticon',
    isCopyable: true,
  },
}

export const Substrate: Story = {
  args: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    size: 24,
    theme: 'substrate',
    isCopyable: true,
  },
}

export const Empty: Story = {
  args: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    size: 24,
    theme: 'empty',
  },
}
