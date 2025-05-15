import React, { FC } from 'react'

// This is a simplified wrapper for Storybook only
export const AccountIconStoryWrapper: FC<{
  address: string
  isAlternative?: boolean
  isHighlight?: boolean
  onCopy?: (value: string) => void
  size?: number
  theme?: string
}> = (props) => {
  return (
    <div
      style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      {/* Use a placeholder div instead of the actual component with external dependencies */}
      <div
        style={{
          width: props.size || 48,
          height: props.size || 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          fontSize: (props.size || 48) / 4,
          fontWeight: 'bold',
        }}
      >
        {props.address.substring(0, 2)}
      </div>
    </div>
  )
}
