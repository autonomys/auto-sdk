import { Actions } from '@/components/Actions'
import { WalletDropdown } from '@/components/WalletDropdown'
import Image from 'next/image'
import { FC } from 'react'

export const Header: FC = () => {
  return (
    <div className='z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex'>
      <>
        <WalletDropdown />
        <Actions />
      </>
      <div className='fixed bottom-0 left-0 flex h-48 w-full items-end justify-center lg:static lg:size-auto' />

      {/* <div className='fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none'>
        <a
          className='pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0'
          href='https://autonomys.net'
          target='_blank'
          rel='noopener noreferrer'
        >
          By <Image src='/autonomys.svg' alt='Autonomys Logo' width={100} height={24} priority />
        </a>
      </div> */}
    </div>
  )
}
