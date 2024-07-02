import { useWalletsStates } from '@/states/wallets'
import { mockURIs, mockWallets } from '@autonomys/auto-utils'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { useNetwork } from './useNetwork'

export const useWallets = () => {
  const params = useParams()
  const { config } = useNetwork()
  const { walletsSigners, setWalletsSigners, setSelectedWallet } = useWalletsStates()
  const walletName = params.walletName

  const handleLoadWallet = useCallback(async () => setWalletsSigners(await mockWallets(config)), [])

  useEffect(() => {
    handleLoadWallet()
  }, [handleLoadWallet])

  const selectedWallet = useMemo(() => {
    const walletIndex = mockURIs.findIndex((w) => w === `//${walletName}`)
    if (walletIndex === -1) return
    return walletsSigners[walletIndex]
  }, [walletName, walletsSigners])

  useEffect(() => {
    if (selectedWallet) setSelectedWallet(selectedWallet)
  }, [selectedWallet])

  return { handleLoadWallet, walletsSigners, selectedWallet }
}
