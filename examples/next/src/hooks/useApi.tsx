import { ApiPromise, activate } from '@autonomys/auto-utils'
import { useCallback, useEffect, useState } from 'react'
import { useNetwork } from './useNetwork'

export const useApi = () => {
  const { config } = useNetwork()
  const [api, setApi] = useState<ApiPromise | null>(null)

  const handleLoadApi = useCallback(async () => {
    const _api = await activate(config)
    setApi(_api)
  }, [])

  useEffect(() => {
    if (api === null) handleLoadApi()
  }, [handleLoadApi, api])

  return { handleLoadApi, api }
}
