import { useEffect } from 'react';
import { useStore } from 'zustand';
import { useWalletStore } from '../provider';

/**
 * React hook for accessing wallet state and actions.
 * Must be used within a <WalletProvider>.
 *
 * Auto-detects installed wallet extensions on mount.
 */
export const useWallet = () => {
  const store = useWalletStore();
  const state = useStore(store);

  // Auto-detect wallets on hook mount
  useEffect(() => {
    state.detectWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    loadingType: state.loadingType,
    connectionError: state.connectionError,
    selectedWallet: state.selectedWallet,
    selectedAccount: state.selectedAccount,
    accounts: state.accounts,
    availableWallets: state.availableWallets,
    injector: state.injector,
    config: state.config,

    // Actions
    connectWallet: state.connectWallet,
    disconnectWallet: state.disconnectWallet,
    selectAccount: state.selectAccount,
    clearError: state.clearError,

    // Computed
    hasWallets: state.availableWallets.length > 0,
    selectedAddress: state.selectedAccount?.address || null,
    isConnecting: state.isLoading && state.loadingType === 'connecting',
    isInitializing: state.isLoading && state.loadingType === 'initializing',
    canConnect: !state.isLoading && !state.isConnected,
  };
};
