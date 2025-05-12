import React, { FC } from 'react'
import { Button, ButtonProps } from './Button'

type ArrowButtonProps = Omit<ButtonProps, 'variant' | 'rightIcon'>

// Custom arrow icon component
const ArrowIcon: FC = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='#1949D2'
    strokeWidth='1.5'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <line x1='5' y1='12' x2='19' y2='12'></line>
    <polyline points='12 5 19 12 12 19'></polyline>
  </svg>
)

export const ArrowButton: FC<ArrowButtonProps> = ({ children, ...rest }) => (
  <Button variant='arrow' rightIcon={<ArrowIcon />} {...rest}>
    {children}
  </Button>
)
