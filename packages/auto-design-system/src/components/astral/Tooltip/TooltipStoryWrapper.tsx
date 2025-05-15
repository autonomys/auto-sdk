import React, { FC, useState } from 'react'

interface TooltipProps {
  text: string | React.ReactNode
  children: React.ReactNode
  direction?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export const TooltipStoryWrapper: FC<TooltipProps> = ({
  text,
  children,
  direction = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false)

  // Simple positioning logic
  const getPositionStyle = () => {
    switch (direction) {
      case 'top':
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' }
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' }
      case 'left':
        return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' }
      case 'right':
        return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' }
      default:
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' }
    }
  }

  return (
    <div
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      className='inline-block cursor-pointer relative'
    >
      {children}

      {isVisible && (
        <div
          className={`z-50 absolute rounded-md bg-blue-600 p-2 text-sm text-white shadow-lg ${className}`}
          style={getPositionStyle()}
        >
          {text}
        </div>
      )}
    </div>
  )
}
