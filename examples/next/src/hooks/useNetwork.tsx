import { networks } from '@autonomys/auto-utils'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

export const useNetwork = () => {
  const params = useParams()
  const networkName = params.networkName

  const [config, setConfig] = useState(
    !networkName || Array.isArray(networkName)
      ? process.env.LOCALHOST === 'true' || process.env.NEXT_PUBLIC_LOCALHOST === 'true'
        ? { networkId: 'localhost' }
        : { networkId: networks[0].id }
      : { networkId: networkName },
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

  useEffect(() => {
    if (networkName && config.networkId !== networkName && Array.isArray(networkName) === false)
      handleNetworkChange(networkName)
  }, [networkName])

  return { config, handleNetworkChange }
}
