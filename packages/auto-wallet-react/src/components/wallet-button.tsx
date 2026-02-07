import React, { useState } from 'react';
import { Button } from './ui/button';
import { useWallet } from '../hooks/use-wallet';
import { shortenAddress } from '@autonomys/auto-wallet';
import { Copy, Check } from 'lucide-react';
import type { WalletAccount } from '@autonomys/auto-wallet';

interface AccountDropdownProps {
  accounts: WalletAccount[];
  selectedAccount: WalletAccount;
  onSelectAccount: (address: string) => void;
  onDisconnect: () => void;
}

const AccountDropdown: React.FC<AccountDropdownProps> = ({
  accounts,
  selectedAccount,
  onSelectAccount,
  onDisconnect,
}) => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = async (e: React.MouseEvent, address: string) => {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
      <div className="p-2">
        <div className="text-xs text-gray-500 mb-2">Select Account</div>
        {accounts.map((account: WalletAccount) => (
          <div
            key={account.address}
            className={`w-full text-left px-2 py-1 rounded text-sm ${
              account.address === selectedAccount?.address
                ? 'bg-blue-50 text-blue-600'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => onSelectAccount(account.address)}
                className="flex-1 text-left font-medium hover:opacity-80"
              >
                {account.name || shortenAddress(account.address)}
              </button>
              <button
                onClick={e => handleCopy(e, account.address)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Copy address"
              >
                {copiedAddress === account.address ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-500" />
                )}
              </button>
            </div>
            <button
              onClick={() => onSelectAccount(account.address)}
              className="w-full text-left text-xs text-gray-500 mt-1 hover:opacity-80"
              title={account.address}
            >
              {shortenAddress(account.address, 8)}
            </button>
          </div>
        ))}
        <div className="border-t mt-2 pt-2">
          <button
            onClick={onDisconnect}
            className="w-full text-left px-2 py-1 rounded text-sm text-red-600 hover:bg-red-50"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};

interface WalletButtonProps {
  onOpenModal?: () => void;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ onOpenModal }) => {
  const {
    isConnected,
    isLoading,
    loadingType,
    selectedAccount,
    accounts,
    selectAccount,
    disconnectWallet,
  } = useWallet();

  const [showDropdown, setShowDropdown] = useState(false);

  const handleDisconnect = () => {
    disconnectWallet();
    setShowDropdown(false);
  };

  const handleSelectAccount = (address: string) => {
    selectAccount(address);
    setShowDropdown(false);
  };

  // Show loading state
  if (isLoading) {
    const loadingText = loadingType === 'initializing' ? 'Reconnecting...' : 'Connecting...';
    return (
      <Button disabled className="relative">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{loadingText}</span>
        </div>
      </Button>
    );
  }

  if (isConnected && selectedAccount) {
    return (
      <div className="relative">
        <Button
          variant="secondary"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-3"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {selectedAccount.name || shortenAddress(selectedAccount.address)}
              </span>
              <span className="text-xs text-gray-500">
                {shortenAddress(selectedAccount.address, 6)}
              </span>
            </div>
          </div>
          <svg
            className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <AccountDropdown
              accounts={accounts}
              selectedAccount={selectedAccount}
              onSelectAccount={handleSelectAccount}
              onDisconnect={handleDisconnect}
            />
          </>
        )}
      </div>
    );
  }

  return <Button onClick={onOpenModal}>Connect Wallet</Button>;
};
