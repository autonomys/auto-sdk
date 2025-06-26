import { MusicalNoteIcon } from '@heroicons/react/24/outline'
import React from 'react'

export interface AudioPlayerProps {
  src: string
}

export const AudioPlayer = ({ src }: AudioPlayerProps) => {
  return (
    <div className='flex flex-col items-center justify-center rounded-lg bg-gray-100 p-6 dark:bg-gray-800'>
      <MusicalNoteIcon className='mb-4 h-16 w-16 text-gray-400 dark:text-gray-500' />
      <audio className='w-full' controls>
        <source src={src} />
        <track kind='captions' src='' label='English' />
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}
