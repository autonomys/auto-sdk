import { ActionBody } from '@/components/ActionBody'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import Image from 'next/image'

export default function Home() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24 relative'>
      <div className='absolute inset-0'>
        <Image
          src='/images/auto-background.png'
          alt='Background'
          layout='fill'
          objectFit='cover'
          quality={100}
          priority
        />
        <div className='p-4'>
          <Header />
          <ActionBody />
          <Footer />
        </div>
      </div>
    </main>
  )
}
