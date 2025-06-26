import { CodeBracketIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import React from 'react'
import { cn } from '../../../utils/cn'

export interface TextViewerProps {
  content: string
  extension: string
}

export const TextViewer = ({ content, extension }: TextViewerProps) => {
  const isCode = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'html',
    'css',
    'py',
    'java',
    'rb',
    'go',
    'rust',
    'php',
    'json',
  ].includes(extension)

  return (
    <div className='relative overflow-hidden rounded-md'>
      <div className='absolute right-2 top-2 z-10'>
        {isCode ? (
          <CodeBracketIcon className='h-5 w-5 text-gray-500 dark:text-gray-400' />
        ) : (
          <DocumentTextIcon className='h-5 w-5 text-gray-500 dark:text-gray-400' />
        )}
      </div>
      <pre
        className={cn(
          'max-h-[50vh] overflow-auto p-4',
          isCode
            ? 'bg-gray-800 text-gray-100 dark:bg-gray-900'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
        )}
      >
        <code>{content}</code>
      </pre>
    </div>
  )
}
