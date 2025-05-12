import React, { FC, useCallback, useState } from 'react'
import { sendGAEvent } from '../../../lib/analytics'
import { exportToExcel } from '../../../lib/exportToExcel'
import { Button, ButtonProps } from './Button'

type LazyExportButtonProps = Omit<ButtonProps, 'variant' | 'onClick' | 'isLoading'> & {
  query: () => Promise<unknown[]>
  filename: string
}

type ButtonStates = 'idle' | 'loading' | 'error'

const textByState: Record<ButtonStates, string> = {
  idle: 'Download full board',
  loading: 'Loading...',
  error: 'Error',
}

export const LazyExportButton: FC<LazyExportButtonProps> = ({
  query,
  filename,
  children,
  ...rest
}) => {
  const [state, setState] = useState<ButtonStates>('idle')

  const handleClick = useCallback(() => {
    setState('loading')
    query()
      .then((data) => {
        exportToExcel(data, `${filename}.xlsx`)
        setState('idle')
        sendGAEvent('event', 'export_full_data', {
          value: `filename:${filename}`,
        })
      })
      .catch((e) => {
        console.error('Error query for full board data', e)
        setState('error')
        setTimeout(() => setState('idle'), 3000)
        sendGAEvent('event', 'error', {
          value: e,
        })
      })
  }, [filename, query])

  return (
    <Button
      variant='export'
      onClick={handleClick}
      isLoading={state === 'loading'}
      loadingLabel={textByState[state]}
      {...rest}
    >
      {children || textByState[state]}
    </Button>
  )
}
