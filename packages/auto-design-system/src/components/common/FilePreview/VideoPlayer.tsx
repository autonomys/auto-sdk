import React from 'react'

export interface VideoPlayerProps {
  src: string
  type?: string
}

export const VideoPlayer = ({ src, type }: VideoPlayerProps) => {
  return (
    <div className='flex justify-center'>
      <video
        className='max-h-[50vh] max-w-full dark:border dark:border-gray-700'
        controls
        autoPlay={false}
      >
        <source src={src} type={type} />
        <track kind='captions' src='' label='English' />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
