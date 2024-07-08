import { networks } from '@autonomys/auto-utils'
import { useCallback, useMemo, useState } from 'react'

export const useNetwork = () => {
  const [config, setConfig] = useState(
    process.env.LOCALHOST === 'true' || process.env.NEXT_PUBLIC_LOCALHOST === 'true'
      ? { networkId: 'autonomys-localhost' }
      : { networkId: networks[0].id },
  )

  const listOfNetworks = useMemo(() => networks.map((network) => network.id), [])

  const handleNetworkChange = useCallback(
    (networkId: string) => {
      if (!listOfNetworks.includes(networkId)) {
        throw new Error(`Network ${networkId} not found`)
      }

      setConfig({ networkId })
    },
    [listOfNetworks],
  )

  return { config, handleNetworkChange }
}
