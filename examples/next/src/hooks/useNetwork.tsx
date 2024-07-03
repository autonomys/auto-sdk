import { networks } from '@autonomys/auto-utils'
import { useMemo } from 'react'

export const useNetwork = () => {
  const config = useMemo(
    () =>
      process.env.LOCALHOST === 'true' || process.env.NEXT_PUBLIC_LOCALHOST === 'true'
        ? { networkId: 'autonomys-localhost' }
        : { networkId: networks[0].id },
    [],
  )

  return { config }
}
