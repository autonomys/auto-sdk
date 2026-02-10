import type { WalletConfig } from './types';

export const DEFAULT_WALLET_CONFIG: Required<WalletConfig> = {
  dappName: 'Autonomys',
  storageKey: 'autonomys-wallet-preferences',
  ss58Prefix: 6094,
  supportedWallets: ['talisman', 'subwallet-js', 'polkadot-js'],
  connectionTimeout: 30000,
  installUrls: {
    'talisman':
      'https://chrome.google.com/webstore/detail/talisman-polkadot-wallet/fijngjgcjhjmmpcmkeiomlglpeiijkld',
    'subwallet-js':
      'https://chrome.google.com/webstore/detail/subwallet-polkadot-extens/onhogfjeacnfoofkfgppdlbmlmnplgbn',
    'polkadot-js':
      'https://chrome.google.com/webstore/detail/polkadot%7Bjs%7D-extension/mopnmbcafieddcagagdcbnhejhlodfdd',
  },
};
