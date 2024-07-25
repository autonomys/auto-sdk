import { FC } from 'react'

export const Footer: FC = () => {
  return (
    <div className='absolute mb-32 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left bottom-0'>
      <a
        href='https://github.com/autonomys/auto-sdk'
        className='group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30'
        rel='noopener noreferrer'
      >
        <h2 className='mb-3 text-2xl font-semibold'>
          Contribute{' '}
          <span className='inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none'>
            -&gt;
          </span>
        </h2>
        <p className='m-0 max-w-[30ch] text-sm opacity-50'>Contribute to this repo.</p>
      </a>
    </div>
  )
}
