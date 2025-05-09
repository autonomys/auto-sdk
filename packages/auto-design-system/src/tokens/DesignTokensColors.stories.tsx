import { autoTokens } from '@autonomys/design-tokens'
import React, { useState } from 'react'

console.log('autoTokens', autoTokens)

// Default export is required by Storybook
export default {
  title: 'Design Tokens/Colors',
  parameters: {
    docs: {
      description: {
        component: 'All available color tokens in the Auto Design system.',
      },
    },
    layout: 'padded',
  },
}

interface ColorItemProps {
  name: string
  value: string
  className?: string
}

// Color item component
const ColorItem = ({ name, value, className = '' }: ColorItemProps) => (
  <tr className='border-b border-gray-200'>
    <td className='p-2 font-mono text-sm'>{name}</td>
    <td className='p-2 font-mono text-sm'>{value}</td>
    <td className='p-2'>
      <div className={`w-10 h-10 rounded ${className}`}></div>
    </td>
  </tr>
)

interface ColorSectionProps {
  title: string
  colors: React.ReactNode
}

// Color section component
const ColorSection = ({ title, colors }: ColorSectionProps) => (
  <div className='mb-8'>
    <h2 className='mb-4 auto-x-1 text-auto-2xl'>{title}</h2>
    <table className='w-full border-collapse'>
      <thead>
        <tr className='table-header-row'>
          <th className='p-2 text-left'>Token Name</th>
          <th className='p-2 text-left'>Hex Value</th>
          <th className='p-2 text-left'>Preview</th>
        </tr>
      </thead>
      <tbody>{colors}</tbody>
    </table>
  </div>
)

export const AllColors = () => {
  // Get colors from autoTokens
  const colors = Object.entries(autoTokens.colors).map(([key, value]) => (
    <ColorItem key={key} name={key} value={value as string} className={`bg-${key}`} />
  ))

  return (
    <div className='auto-m-4'>
      <ColorSection title='Auto Design Tokens - Colors' colors={colors} />
    </div>
  )
}
