import { wallets } from '@/constants/wallets'
import { useWalletsStates } from '@/states/wallets'
import { WalletsSigners } from '@/types/wallet'
import { ActivateWalletInput, activateWallet } from '@autonomys/auto-utils'
import { useCallback, useEffect } from 'react'
import { useNetwork } from './useNetwork'

export const useWallets = () => {
  const { config } = useNetwork()
  const { walletsSigners, setWalletsSigners } = useWalletsStates()

  const handleLoadWallet = useCallback(async () => {
    const walletsSigners: WalletsSigners = []

    for (let w = 0; w < wallets.length; w++) {
      const { api, accounts } = await activateWallet({
        ...config,
        uri: wallets[w].uri,
      } as ActivateWalletInput)
      walletsSigners.push({
        ...wallets[w],
        accounts,
        api,
      })
    }

    setWalletsSigners(walletsSigners)
  }, [])

  useEffect(() => {
    if (walletsSigners.length === 0) handleLoadWallet()
  }, [handleLoadWallet, walletsSigners])

  return { handleLoadWallet, walletsSigners }
}
