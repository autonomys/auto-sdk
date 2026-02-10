import type { Wallet, WalletAccount } from '@talismn/connect-wallets';
import type { InjectedExtension } from '@polkadot/extension-inject/types';

/** Configuration for the wallet store. All fields are optional with sensible defaults. */
export interface WalletConfig {
  /** Name shown to users when requesting wallet connection. Default: 'Autonomys' */
  dappName?: string;
  /** localStorage key for persisting wallet preferences. Default: 'autonomys-wallet-preferences' */
  storageKey?: string;
  /** SS58 address prefix for address formatting. Default: 6094 (Autonomys mainnet) */
  ss58Prefix?: number;
  /** List of supported wallet extension names. Default: ['talisman', 'subwallet-js', 'polkadot-js'] */
  supportedWallets?: string[];
  /** Timeout in ms for wallet connection attempts. Default: 30000 */
  connectionTimeout?: number;
  /** Map of wallet extension name to install URL. Default: Chrome Web Store links */
  installUrls?: Record<string, string>;
}

export type LoadingType = 'connecting' | 'initializing' | null;

export interface WalletState {
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  loadingType: LoadingType;
  connectionError: string | null;

  // Wallet data
  selectedWallet: string | null;
  selectedAccount: WalletAccount | null;
  accounts: WalletAccount[];
  injector: InjectedExtension | null;

  // Available wallets
  availableWallets: Wallet[];

  // Resolved configuration
  config: Required<WalletConfig>;

  /** @internal Monotonically increasing counter to identify the latest connection attempt. */
  _connectionSeq: number;

  // Actions
  connectWallet: (extensionName: string) => Promise<void>;
  disconnectWallet: () => void;
  selectAccount: (address: string) => void;
  clearError: () => void;
  detectWallets: () => void;
  initializeConnection: () => Promise<void>;
}

export type WalletConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'initializing'
  | 'connected'
  | 'error';

// Re-export types from dependencies for consumer convenience
export type { Wallet, WalletAccount } from '@talismn/connect-wallets';
export type { InjectedExtension } from '@polkadot/extension-inject/types';
