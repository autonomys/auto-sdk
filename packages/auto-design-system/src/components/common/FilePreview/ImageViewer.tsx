import React, { useMemo } from 'react'
import { cn } from '../../../utils/cn'
import { sanitizeHTML } from '../../../utils/sanitizeHTML'

export interface ImageViewerProps {
  src: string
  alt?: string
}

export const ImageViewer = ({ src, alt }: ImageViewerProps) => {
  const sanitizedAlt = useMemo(() => {
    return alt ? sanitizeHTML(alt) : null
  }, [alt])

  return (
    <div className='relative flex flex-col items-center'>
      <img
        src={src}
        alt={sanitizedAlt || 'Image preview'}
        className={cn(
          'max-h-[50vh] w-auto object-contain dark:border dark:border-gray-700 dark:bg-gray-900',
        )}
      />
    </div>
  )
}
