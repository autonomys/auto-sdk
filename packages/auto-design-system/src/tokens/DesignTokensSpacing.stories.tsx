import { autoTokens } from '@autonomys/design-tokens'
import React from 'react'

// Default export is required by Storybook
export default {
  title: 'Design Tokens/Spacing',
  parameters: {
    docs: {
      description: {
        component: 'All available spacing tokens in the Auto Design system.',
      },
    },
    layout: 'padded',
  },
}

interface TokenItemProps {
  name: string
  value: string
  preview?: React.ReactNode
}

// Token item component
const TokenItem = ({ name, value, preview }: TokenItemProps) => (
  <tr className='border-b border-gray-200'>
    <td className='p-2 font-mono text-sm'>{name}</td>
    <td className='p-2 font-mono text-sm'>{value}</td>
    <td className='p-2'>{preview}</td>
  </tr>
)

interface TokenSectionProps {
  title: string
  tokens: React.ReactNode
}

// Token section component
const TokenSection = ({ title, tokens }: TokenSectionProps) => (
  <div className='mb-8'>
    <h2 className='mb-4 auto-x-1 text-auto-2xl'>{title}</h2>
    <table className='w-full border-collapse'>
      <thead>
        <tr>
          <th className='p-2 text-left'>Token Name</th>
          <th className='p-2 text-left'>Value</th>
          <th className='p-2 text-left'>Preview</th>
        </tr>
      </thead>
      <tbody>{tokens}</tbody>
    </table>
  </div>
)

export const Spacing = () => {
  const spacingTokens = Object.entries(autoTokens.spacing).map(([key, value]) => (
    <TokenItem
      key={key}
      name={key}
      value={String(value)}
      preview={
        <div className='flex items-center'>
          <div className={`h-6 bg-gray-300 w-${key}`}></div>
          <div className='ml-2 text-sm text-gray-600'>{String(value)}</div>
        </div>
      }
    />
  ))

  return (
    <div className='auto-m-4'>
      <TokenSection title='Spacing Values' tokens={spacingTokens} />
    </div>
  )
}

export const BorderRadius = () => {
  const borderRadiusTokens = Object.entries(autoTokens.borderRadius).map(([key, value]) => (
    <TokenItem
      key={key}
      name={key}
      value={String(value)}
      preview={<div className={`bg-gray-300 w-16 h-16 rounded-${key}`}></div>}
    />
  ))

  return (
    <div className='auto-m-4'>
      <TokenSection title='Border Radius Values' tokens={borderRadiusTokens} />
    </div>
  )
}
