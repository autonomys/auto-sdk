import { wallets } from '@/constants/wallets'
import { useWalletsStates } from '@/states/wallets'
import { mockWallets } from '@autonomys/auto-utils'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { useNetwork } from './useNetwork'

export const useWallets = () => {
  const params = useParams()
  const { config } = useNetwork()
  const { walletsSigners, setWalletsSigners, setSelectedWallet } = useWalletsStates()
  const walletName = params.walletName

  const handleLoadWallet = useCallback(async () => {
    const wallets = await mockWallets(config)
    setWalletsSigners(wallets)
  }, [])

  useEffect(() => {
    handleLoadWallet()
  }, [handleLoadWallet])

  useEffect(() => {
    const walletIndex = wallets.findIndex((w) => w.name === walletName)
    if (walletIndex === -1) return
    setSelectedWallet(walletsSigners[walletIndex])
  }, [walletName])

  const selectedWallet = useMemo(() => {
    const walletIndex = wallets.findIndex((w) => w.name === walletName)
    if (walletIndex === -1) return
    return walletsSigners[walletIndex]
  }, [walletName, walletsSigners])

  return { handleLoadWallet, walletsSigners, selectedWallet }
}
