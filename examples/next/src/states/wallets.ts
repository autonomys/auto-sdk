import { wallets } from '@/constants/wallets'
import { Action } from '@/types/action'
import { WalletSigner, Wallets, WalletsSigners } from '@/types/wallet'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface MultiSigDefaultState {
  wallets: Wallets
  walletsSigners: WalletsSigners
  selectedWallet: WalletSigner | null
  selectedAction: Action | null
}

interface MultiSigState extends MultiSigDefaultState {
  setWalletsSigners: (walletsSigners: WalletsSigners) => void
  setSelectedWallet: (selectedWallet: WalletSigner) => void
  setSelectedAction: (selectedAction: Action) => void
  clear: () => void
}

const initialState: MultiSigDefaultState = {
  wallets,
  walletsSigners: [],
  selectedWallet: null,
  selectedAction: null,
}

export const useWalletsStates = create<MultiSigState>()(
  persist(
    (set) => ({
      ...initialState,
      setWalletsSigners: (walletsSigners: WalletsSigners) => set(() => ({ walletsSigners })),
      setSelectedWallet: (selectedWallet: WalletSigner | null) => set(() => ({ selectedWallet })),
      setSelectedAction: (selectedAction: Action | null) => set(() => ({ selectedAction })),
      clear: () => set(() => ({ ...initialState })),
    }),
    {
      name: 'wallets-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
