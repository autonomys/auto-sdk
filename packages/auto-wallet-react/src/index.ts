// Provider
export { WalletProvider } from './provider';
export type { WalletProviderProps } from './provider';

// Hooks
export { useWallet } from './hooks/use-wallet';

// Components
export { WalletButton } from './components/wallet-button';
export { WalletModal } from './components/wallet-modal';
export { WalletOption } from './components/wallet-option';

// Re-exports from core for convenience
export type {
  WalletConfig,
  WalletState,
  WalletConnectionStatus,
  LoadingType,
  WalletAccount,
  InjectedExtension,
} from '@autonomys/auto-wallet';

export { shortenAddress, DEFAULT_WALLET_CONFIG } from '@autonomys/auto-wallet';
