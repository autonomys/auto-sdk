import { wallets } from '@/constants/wallets'
import { Wallets } from '@/types/wallet'
import { WalletActivated } from '@autonomys/auto-utils'
import { create } from 'zustand'

interface MultiSigDefaultState {
  wallets: Wallets
  walletsSigners: WalletActivated[]
  selectedWallet: WalletActivated | null
}

interface MultiSigState extends MultiSigDefaultState {
  setWalletsSigners: (walletsSigners: WalletActivated[]) => void
  setSelectedWallet: (selectedWallet: WalletActivated) => void
  clear: () => void
}

const initialState: MultiSigDefaultState = {
  wallets,
  walletsSigners: [],
  selectedWallet: null,
}

export const useWalletsStates = create<MultiSigState>((set) => ({
  ...initialState,
  setWalletsSigners: (walletsSigners: WalletActivated[]) => set(() => ({ walletsSigners })),
  setSelectedWallet: (selectedWallet: WalletActivated | null) => set(() => ({ selectedWallet })),
  clear: () => set(() => ({ ...initialState })),
}))
