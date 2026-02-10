import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getWallets, getWalletBySource } from '@talismn/connect-wallets';
import type { Wallet } from '@talismn/connect-wallets';
import type { WalletConfig, WalletState } from './types';
import { DEFAULT_WALLET_CONFIG } from './constants';
import { connectToWallet } from './connect';

/**
 * Creates a configured Zustand wallet store.
 * Each call returns a new store instance, allowing multiple apps to have independent wallet state.
 *
 * @param userConfig - Optional partial configuration. Merged with DEFAULT_WALLET_CONFIG.
 * @returns A Zustand store hook with wallet state and actions.
 */
export function createWalletStore(userConfig?: Partial<WalletConfig>) {
  const config: Required<WalletConfig> = {
    ...DEFAULT_WALLET_CONFIG,
    ...userConfig,
    // Deep merge installUrls so partial overrides don't wipe defaults
    installUrls: {
      ...DEFAULT_WALLET_CONFIG.installUrls,
      ...userConfig?.installUrls,
    },
  };

  return create<WalletState>()(
    persist(
      (set, get) => ({
        // State
        isConnected: false,
        isLoading: false,
        loadingType: null,
        connectionError: null,
        selectedWallet: null,
        selectedAccount: null,
        accounts: [],
        injector: null,
        availableWallets: [],
        config,
        _connectionSeq: 0,

        // Actions
        detectWallets: () => {
          try {
            const allWallets = getWallets();
            const supportedWallets = allWallets
              .filter((wallet: Wallet) => {
                // Exclude Nova wallet (duplicate of Polkadot.js)
                if (wallet.title?.toLowerCase().includes('nova')) return false;
                return config.supportedWallets.includes(wallet.extensionName);
              })
              // Remove duplicates by extension name
              .filter(
                (wallet, index, arr) =>
                  arr.findIndex((w) => w.extensionName === wallet.extensionName) === index,
              );
            set({ availableWallets: supportedWallets });
          } catch (error) {
            console.warn('Failed to detect wallets:', error);
            set({ availableWallets: [] });
          }
        },

        connectWallet: async (extensionName: string) => {
          const { isLoading } = get();

          // Prevent multiple simultaneous connection attempts
          if (isLoading) {
            throw new Error('Connection already in progress');
          }

          const seq = get()._connectionSeq + 1;
          set({
            _connectionSeq: seq,
            isLoading: true,
            loadingType: 'connecting',
            connectionError: null,
          });

          try {
            const { accounts, injector } = await connectToWallet(extensionName, config);

            // If a newer connection was started or user disconnected, discard this result
            if (get()._connectionSeq !== seq) {
              return;
            }

            set({
              isConnected: true,
              isLoading: false,
              loadingType: null,
              selectedWallet: extensionName,
              selectedAccount: accounts[0],
              accounts: accounts,
              injector: injector,
              connectionError: null,
            });
          } catch (error) {
            // Only set error if this is still the active connection attempt
            if (get()._connectionSeq !== seq) {
              return;
            }
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';
            console.error('Wallet connection failed:', error);

            set({
              isLoading: false,
              loadingType: null,
              connectionError: errorMessage,
            });
            throw error;
          }
        },

        initializeConnection: async () => {
          const { selectedWallet, selectedAccount, isConnected, isLoading } = get();

          // Prevent multiple simultaneous initialization attempts
          if (isLoading) {
            return;
          }

          // Skip if no persisted data or already connected
          if (!selectedWallet || !selectedAccount || isConnected) {
            return;
          }

          const seq = get()._connectionSeq + 1;
          set({
            _connectionSeq: seq,
            isLoading: true,
            loadingType: 'initializing',
            connectionError: null,
          });

          try {
            // Check if wallet is still installed before attempting connection
            const wallet = getWalletBySource(selectedWallet);
            if (!wallet?.installed) {
              // Clear invalid persisted data
              console.log('Wallet no longer installed, clearing persisted data');
              set({
                selectedWallet: null,
                selectedAccount: null,
                isConnected: false,
                isLoading: false,
                loadingType: null,
              });
              return;
            }

            const { accounts, injector } = await connectToWallet(selectedWallet, config);

            // If a newer connection was started or user disconnected, discard this result
            if (get()._connectionSeq !== seq) {
              return;
            }

            // Find target account by comparing with stored address (already in correct format)
            const targetAccount = accounts.find(
              (acc) => acc.address === selectedAccount.address,
            );

            if (targetAccount) {
              set({
                isConnected: true,
                isLoading: false,
                loadingType: null,
                selectedAccount: targetAccount,
                accounts: accounts,
                injector: injector,
                connectionError: null,
              });
              console.log('Successfully reconnected to wallet');
            } else {
              // Account no longer exists, clear data
              console.log('Account no longer exists, clearing persisted data');
              set({
                selectedWallet: null,
                selectedAccount: null,
                isConnected: false,
                isLoading: false,
                loadingType: null,
                accounts: [],
                injector: null,
              });
            }
          } catch (error) {
            console.warn('Silent reconnection failed, clearing persisted data:', error);
            set({
              isConnected: false,
              isLoading: false,
              loadingType: null,
              selectedWallet: null,
              selectedAccount: null,
              accounts: [],
              injector: null,
            });
          }
        },

        disconnectWallet: () => {
          set({
            _connectionSeq: get()._connectionSeq + 1,
            isConnected: false,
            isLoading: false,
            loadingType: null,
            selectedWallet: null,
            selectedAccount: null,
            accounts: [],
            injector: null,
            connectionError: null,
          });
        },

        selectAccount: (targetAddress: string) => {
          const { accounts, isConnected } = get();
          if (!isConnected) {
            console.warn('Cannot select account when wallet is not connected');
            return;
          }

          // Find account by address (addresses are already in correct format)
          const account = accounts.find((acc) => acc.address === targetAddress);
          if (account) {
            set({ selectedAccount: account });
          } else {
            console.warn('Account not found:', targetAddress);
          }
        },

        clearError: () => {
          set({ connectionError: null });
        },
      }),
      {
        name: config.storageKey,
        partialize: (state) => ({
          selectedWallet: state.selectedWallet,
          selectedAccount: state.selectedAccount,
          // Don't persist connection state to avoid inconsistencies
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.selectedWallet && state?.selectedAccount) {
            // Auto-initialize connection after rehydration
            setTimeout(() => {
              state.initializeConnection().catch((error: unknown) => {
                console.error('Failed to initialize connection:', error);
              });
            }, 500);
          }
        },
      },
    ),
  );
}
