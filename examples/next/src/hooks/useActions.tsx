import {
  Amount,
  balance as balanceOf,
  address as cleanAddress,
  transfer as transferTo,
} from '@autonomys/auto-consensus'
import type { ApiPromise } from '@autonomys/auto-utils'
import { useCallback } from 'react'

export const useActions = (api: ApiPromise) => {
  const address = useCallback(async (address: string) => {
    return await cleanAddress(address)
  }, [])

  const balance = useCallback(
    async (address: string) => {
      return await balanceOf(api, address)
    },
    [api],
  )

  const transfer = useCallback(
    async (address: string, amount: Amount) => {
      return await transferTo(api, address, amount)
    },
    [api],
  )

  return { address, balance, transfer }
}
