import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Auto SDK Next.js Example',
  description:
    'An example of using the Auto SDK with Next.js to interact with the Autonomys network.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <link rel='icon' type='image/svg+xml' href='/assets/images/favicon.svg' />
      <link rel='icon' type='image/png' href='/assets/images/favicon.png' />
      <body className={inter.className}>
        <main className='flex min-h-screen flex-col items-center justify-between p-24 relative'>
          <div className='absolute inset-0'>
            <Image
              src='/auto-background.png'
              alt='Background'
              layout='fill'
              objectFit='cover'
              quality={100}
              priority
            />
            <div className='p-4'>
              <Header />
              {children}
              <Footer />
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
