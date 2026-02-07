import React, { createContext, useContext, useRef } from 'react';
import { createWalletStore, type WalletConfig, type WalletState } from '@autonomys/auto-wallet';
import type { StoreApi } from 'zustand';
import { useStore } from 'zustand';

type WalletStore = ReturnType<typeof createWalletStore>;

const WalletStoreContext = createContext<WalletStore | null>(null);

export interface WalletProviderProps {
  config?: Partial<WalletConfig>;
  children: React.ReactNode;
}

/**
 * Provides wallet state to all descendant components.
 * Creates the wallet store once with the given config.
 */
export function WalletProvider({ config, children }: WalletProviderProps) {
  // Create the store once — config changes after mount are intentionally ignored
  const storeRef = useRef<WalletStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createWalletStore(config);
  }

  return (
    <WalletStoreContext.Provider value={storeRef.current}>
      {children}
    </WalletStoreContext.Provider>
  );
}

/**
 * Internal hook for accessing the raw Zustand store from context.
 * Throws if used outside of WalletProvider.
 */
export function useWalletStore(): WalletStore {
  const store = useContext(WalletStoreContext);
  if (!store) {
    throw new Error('useWalletStore must be used within a <WalletProvider>');
  }
  return store;
}
