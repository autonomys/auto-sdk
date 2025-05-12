import React from 'react'
import { sendGAEvent } from '../../../lib/analytics'
import { exportToExcel } from '../../../lib/exportToExcel'
import { Button, ButtonProps } from './Button'

type ExportButtonProps<T extends object> = Omit<ButtonProps, 'variant' | 'onClick'> & {
  data: T[]
  filename: string
}

export const ExportButton = <T extends object>({
  data,
  filename,
  children = 'Download page data',
  ...rest
}: ExportButtonProps<T>) => {
  const handleClick = () => {
    try {
      exportToExcel(data, `${filename}.xlsx`)
      sendGAEvent('event', 'export_page_data', {
        value: `filename:${filename}`,
      })
    } catch (e) {
      sendGAEvent('event', 'error', { value: e })
    }
  }

  return (
    <Button variant='export' onClick={handleClick} {...rest}>
      {children}
    </Button>
  )
}
