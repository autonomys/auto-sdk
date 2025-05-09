import { autoTokens } from '@autonomys/design-tokens'
import React from 'react'

// Default export is required by Storybook
export default {
  title: 'Design Tokens/Shadows',
  parameters: {
    docs: {
      description: {
        component: 'All available shadow tokens in the Auto Design system.',
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

export const BoxShadows = () => {
  const shadowTokens = Object.entries(autoTokens.boxShadow).map(([key, value]) => (
    <TokenItem
      key={key}
      name={key}
      value={String(value)}
      preview={<div className={`w-20 h-20 bg-white rounded shadow-${key}`}></div>}
    />
  ))

  return (
    <div className='auto-m-4'>
      <TokenSection title='Box Shadows' tokens={shadowTokens} />
    </div>
  )
}

export const ElementShadows = () => {
  // Filter shadows with specific use cases like buttons, cards, etc.
  const elementShadows = Object.entries(autoTokens.boxShadow)
    .filter(
      ([key]) =>
        key.includes('auto-button') ||
        key.includes('auto-card') ||
        key.includes('auto-modal') ||
        key.includes('auto-dropdown') ||
        key.includes('auto-header') ||
        key.includes('auto-tooltip'),
    )
    .map(([key, value]) => {
      let elementType = 'Element'
      if (key.includes('button')) elementType = 'Button'
      else if (key.includes('card')) elementType = 'Card'
      else if (key.includes('modal')) elementType = 'Modal'
      else if (key.includes('dropdown')) elementType = 'Dropdown'
      else if (key.includes('header')) elementType = 'Header'
      else if (key.includes('tooltip')) elementType = 'Tooltip'

      const isDark = key.includes('Dark')
      const bgColorClass = isDark ? 'bg-[#333] text-white' : 'bg-white text-black'

      return (
        <TokenItem
          key={key}
          name={key}
          value={String(value)}
          preview={
            <div
              className={`w-30 h-20 ${bgColorClass} rounded shadow-${key} flex items-center justify-center text-sm`}
            >
              {elementType}
            </div>
          }
        />
      )
    })

  return (
    <div className='auto-m-4'>
      <TokenSection title='Element-Specific Shadows' tokens={elementShadows} />
    </div>
  )
}
