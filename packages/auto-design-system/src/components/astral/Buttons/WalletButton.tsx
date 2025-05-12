import React, { FC, useEffect, useState } from 'react'
import { Button, ButtonProps } from './Button'

// Custom useMediaQuery hook
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

// Mock Image component
const Image: FC<{
  src: string
  alt: string
  width: number
  height: number
  className?: string
}> = ({ src, alt, className }) => <img src={src} alt={alt} className={className} />

interface WalletButtonProps extends Omit<ButtonProps, 'variant' | 'children'> {
  onConnectWallet: () => void
}

export const WalletButton: FC<WalletButtonProps> = ({ onConnectWallet, ...rest }) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const WalletButtonContent = () => {
    if (isDesktop) {
      return 'Connect Wallet'
    }

    return (
      <div className='flex h-6 min-h-6 w-6 min-w-6 items-center justify-center'>
        <Image
          src='/images/icons/wallet-addresses-small.webp'
          alt='Wallet list'
          width={24}
          height={24}
          className='h-[24px] min-h-[24px] w-[24px] min-w-[24px]'
        />
      </div>
    )
  }

  return (
    <Button
      variant='wallet'
      onClick={onConnectWallet}
      className={`h-10 ${isDesktop ? 'w-36' : 'w-10'}`}
      {...rest}
    >
      <WalletButtonContent />
    </Button>
  )
}
