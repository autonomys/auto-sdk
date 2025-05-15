import React, { FC, useEffect, useRef } from 'react'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

type Props = {
  title?: string
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: ModalSize
  className?: string
  contentClassName?: string
  overlayClassName?: string
  showTitle?: boolean
  showCloseButton?: boolean
  titleClassName?: string
  closeButtonClassName?: string
}

export const ModalStoryWrapper: FC<Props> = ({
  title = '',
  isOpen,
  onClose,
  children,
  size = '',
  className = '',
  contentClassName = '',
  overlayClassName = '',
  showTitle = true,
  showCloseButton = true,
  titleClassName = '',
  closeButtonClassName = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      modalRef.current?.focus()
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-full max-w-sm'
      case 'md':
        return 'w-full max-w-md'
      case 'lg':
        return 'w-full max-w-lg'
      case 'xl':
        return 'w-full max-w-xl'
      case 'full':
        return 'w-full max-w-full mx-4'
      default:
        return ''
    }
  }

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center transition-colors ${
        isOpen ? 'visible z-20 bg-black/40' : 'invisible'
      } ${className}`}
      aria-hidden={!isOpen}
    >
      {/* Overlay that closes modal when clicked */}
      <div
        className={`absolute inset-0 ${overlayClassName}`}
        onClick={onClose}
        aria-hidden='true'
      />

      <div
        ref={modalRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={title && showTitle ? 'modal-title' : undefined}
        className={`relative rounded-xl bg-white p-6 shadow transition-all dark:bg-gray-800 ${getSizeClass()} ${
          isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'
        } ${contentClassName}`}
        tabIndex={-1}
      >
        {showTitle && title && (
          <h2
            id='modal-title'
            className={`absolute left-6 top-4 text-xl font-medium tracking-tight text-blue-600 dark:text-blue-400 ${titleClassName}`}
          >
            {title}
          </h2>
        )}

        {showCloseButton && (
          <button
            onClick={onClose}
            aria-label='Close modal'
            className={`absolute right-2 top-2 rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-400 ${closeButtonClassName}`}
          >
            <svg
              className='h-5 w-5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        )}

        <div className={`${showTitle && title ? 'mt-10' : ''}`}>{children}</div>
      </div>
    </div>
  )
}
