import { autoTokens } from '@autonomys/design-tokens'
import React from 'react'

// Default export is required by Storybook
export default {
  title: 'Design Tokens/Typography',
  parameters: {
    docs: {
      description: {
        component: 'All available typography tokens in the Auto Design system.',
      },
    },
    layout: 'padded',
  },
}

interface TokenItemProps {
  name: string
  value: string | number
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
    <h2 className='mb-4 text-auto-2xl'>{title}</h2>
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

export const FontSize = () => {
  const fontSizeClassMap: Record<string, string> = {}

  // Generate classes for each fontSize token
  Object.keys(autoTokens.fontSize).forEach((key) => {
    fontSizeClassMap[key] = `text-${key}`
  })

  const fontSizes = Object.entries(autoTokens.fontSize).map(([key, value]) => (
    <TokenItem
      key={key}
      name={key}
      value={value as string}
      preview={<span className={fontSizeClassMap[key]}>Aa</span>}
    />
  ))

  return (
    <div className='auto-m-4'>
      <TokenSection title='Font Sizes' tokens={fontSizes} />
    </div>
  )
}

export const FontWeight = () => {
  const fontWeightClassMap: Record<string, string> = {
    'auto-extralight': 'font-auto-extralight',
    'auto-light': 'font-auto-light',
    'auto-normal': 'font-auto-normal',
    'auto-medium': 'font-auto-medium',
    'auto-semibold': 'font-auto-semibold',
    'auto-bold': 'font-auto-bold',
    'auto-extrabold': 'font-auto-extrabold',
  }

  const fontWeights = Object.entries(autoTokens.fontWeight).map(([key, value]) => (
    <TokenItem
      key={key}
      name={key}
      value={value as number}
      preview={<span className={fontWeightClassMap[key]}>The quick brown fox</span>}
    />
  ))

  return (
    <div className='m-auto-4'>
      <TokenSection title='Font Weights' tokens={fontWeights} />
    </div>
  )
}

export const LineHeight = () => {
  const lineHeightClassMap: Record<string, string> = {
    'auto-none': 'leading-auto-none',
    'auto-tight': 'leading-auto-tight',
    'auto-snug': 'leading-auto-snug',
    'auto-normal': 'leading-auto-normal',
    'auto-relaxed': 'leading-auto-relaxed',
    'auto-loose': 'leading-auto-loose',
  }

  const lineHeights = Object.entries(autoTokens.lineHeight).map(([key, value]) => (
    <TokenItem
      key={key}
      name={key}
      value={value as number}
      preview={
        <div className={`${lineHeightClassMap[key]} w-[300px] border border-gray-200 p-2`}>
          This is an example text with different line height settings to demonstrate spacing between
          lines.
        </div>
      }
    />
  ))

  return (
    <div className='m-auto-4'>
      <TokenSection title='Line Heights' tokens={lineHeights} />
    </div>
  )
}

export const LetterSpacing = () => {
  const letterSpacingClassMap: Record<string, string> = {
    'auto-tighter': 'tracking-auto-tighter',
    'auto-tight': 'tracking-auto-tight',
    'auto-normal': 'tracking-auto-normal',
    'auto-wide': 'tracking-auto-wide',
    'auto-wider': 'tracking-auto-wider',
    'auto-widest': 'tracking-auto-widest',
  }

  const letterSpacings = Object.entries(autoTokens.letterSpacing).map(([key, value]) => (
    <TokenItem
      key={key}
      name={key}
      value={value as string}
      preview={<span className={letterSpacingClassMap[key]}>LETTER SPACING</span>}
    />
  ))

  return (
    <div className='m-auto-4'>
      <TokenSection title='Letter Spacing' tokens={letterSpacings} />
    </div>
  )
}
