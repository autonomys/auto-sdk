import { activate } from '@autonomys/auto-utils'
import type { ApiPromise } from '@polkadot/api'
import { useCallback, useEffect, useState } from 'react'
import { useNetwork } from './useNetwork'

export const useApi = () => {
  const { config } = useNetwork()
  const [api, setApi] = useState<ApiPromise | null>(null)

  const handleLoadApi = useCallback(async () => setApi(await activate(config)), [])

  const handleQuery = useCallback(
    async (query: any, setValue: (value: any) => void, setErrorForm?: (error: any) => void) => {
      setErrorForm && setErrorForm('')
      try {
        if (!api) {
          setErrorForm && setErrorForm('API not loaded')
          return
        }

        if (!query) {
          setErrorForm && setErrorForm('Error no query')
          return
        }

        setValue(query())
      } catch (error) {
        setErrorForm && setErrorForm((error as any).message)
      }
    },
    [api],
  )

  useEffect(() => {
    if (api === null) handleLoadApi()
  }, [handleLoadApi, api])

  return { handleLoadApi, handleQuery, api }
}
