import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
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
      <body className={inter.className}>{children}</body>
    </html>
  )
}
