import { shortString } from '@autonomys/auto-utils'
import Identicon from '@polkadot/react-identicon'
import { IconTheme } from '@polkadot/react-identicon/types'
import { isAddress } from 'ethers'
import Link from 'next/link'
import React, { FC } from 'react'
import useMediaQuery from '../../../hooks/useMediaQuery'
import { cn } from '../../../lib/cn'
import { CopyButton } from '../Buttons/CopyButton'
interface AccountIconProps {
  address: string
  isAlternative?: boolean
  isHighlight?: boolean
  onCopy?: (value: string) => void
  size?: number
  theme?: IconTheme
  className?: string
}

export const AccountIcon: FC<AccountIconProps> = ({
  address,
  isAlternative,
  isHighlight,
  onCopy,
  size = 48,
  theme = 'beachball',
}) => {
  return (
    <Identicon
      isAlternative={isAlternative}
      isHighlight={isHighlight}
      onCopy={onCopy}
      size={size}
      theme={theme}
      value={address}
    />
  )
}

export const AccountIconWithLink = ({
  address,
  link,
  forceShortString = false,
  className,
  isCopyable = false,
  ...props
}: AccountIconProps & {
  link?: string
  forceShortString?: boolean
  isCopyable?: boolean
}) => {
  const isDesktop = useMediaQuery('(min-width: 1440px)')
  const isEthereumAddress = isAddress(address)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {!isEthereumAddress ? (
        <>
          <AccountIcon address={address} size={26} theme='beachball' {...props} />
          <Link href={link ?? ''} className='hover:text-auto-explorer-primaryAccent'>
            <div>{!isDesktop || forceShortString ? shortString(address) : address}</div>
          </Link>
          {isCopyable && <CopyButton value={address} className='px-0' />}
        </>
      ) : (
        <>
          <AccountIcon address={address} size={26} theme='ethereum' {...props} />
          <div>{address}</div>
          {isCopyable && <CopyButton value={address} className='px-0' />}
        </>
      )}
    </div>
  )
}
