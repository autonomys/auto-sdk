import { getWalletBySource } from '@talismn/connect-wallets';
import type { Wallet } from '@talismn/connect-wallets';
import { address } from '@autonomys/auto-utils';
import type { WalletConfig } from './types';

/**
 * Core wallet connection logic. Connects to a browser wallet extension,
 * enables it, fetches accounts, and converts addresses to the configured SS58 format.
 *
 * @param extensionName - The wallet extension name (e.g. 'polkadot-js')
 * @param config - Resolved wallet configuration
 * @param resolvedWallet - Optional pre-resolved wallet object. When provided, this wallet is used
 *   directly instead of looking up by extensionName. This avoids ambiguity when multiple wallet
 *   classes share the same extensionName (e.g. NovaWallet and PolkadotjsWallet both use 'polkadot-js').
 */
export const connectToWallet = async (
  extensionName: string,
  config: Required<WalletConfig>,
  resolvedWallet?: Wallet,
) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Connection timeout')), config.connectionTimeout);
  });

  const wallet = resolvedWallet ?? getWalletBySource(extensionName);
  if (!wallet) {
    clearTimeout(timeoutId);
    throw new Error(`Wallet not found: ${extensionName}`);
  }

  if (!wallet.installed) {
    clearTimeout(timeoutId);
    throw new Error(`${wallet.title} is not installed. Please install the extension first.`);
  }

  // Enable wallet with timeout
  try {
    await Promise.race([wallet.enable(config.dappName), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!wallet.extension) {
    throw new Error(`Extension not available for ${extensionName}`);
  }

  const rawAccounts = await wallet.getAccounts();
  if (!rawAccounts || rawAccounts.length === 0) {
    throw new Error(`No accounts found in ${wallet.title}. Please create an account first.`);
  }

  // Convert all account addresses to the configured SS58 format
  const accounts = rawAccounts.map((account) => ({
    ...account,
    address: address(account.address, config.ss58Prefix),
  }));

  return {
    accounts,
    injector: wallet.extension,
    wallet,
  };
};
