import { networks } from '@autonomys/auto-utils'
import { useMemo } from 'react'

export const useNetwork = () => {
  const config = useMemo(
    () =>
      process.env.LOCALHOST !== 'true'
        ? { networkId: networks[0].id }
        : { networkId: 'autonomys-localhost' },
    [],
  )

  return { config }
}
