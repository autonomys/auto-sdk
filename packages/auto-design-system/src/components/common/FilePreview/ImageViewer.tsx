import React from 'react'
import { cn } from '../../../utils/cn'

export interface ImageViewerProps {
  src: string
  alt?: string
}

export const ImageViewer = ({ src, alt }: ImageViewerProps) => {
  return (
    <div className='relative flex flex-col items-center'>
      <img
        src={src}
        alt={alt || 'Image preview'}
        className={cn(
          'max-h-[50vh] w-auto object-contain dark:border dark:border-gray-700 dark:bg-gray-900',
        )}
      />
    </div>
  )
}
