import { DocumentIcon } from '@heroicons/react/24/outline'
import React from 'react'

export interface PDFViewerProps {
  src: string
}

export const PDFViewer = ({ src }: PDFViewerProps) => {
  return (
    <div className='flex flex-col items-center'>
      <embed
        src={src}
        type='application/pdf'
        className='h-[50vh] w-full dark:border dark:border-gray-700'
      />
      <a
        href={src}
        target='_blank'
        rel='noopener noreferrer'
        className='mt-2 flex items-center text-auto-drive-accent hover:underline dark:text-darkAccent'
      >
        <DocumentIcon className='mr-1 h-4 w-4' />
        Open PDF in new tab
      </a>
    </div>
  )
}
