import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { WalletOption } from './wallet-option';
import { useWallet } from '../hooks/use-wallet';

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ open, onOpenChange }) => {
  const {
    availableWallets,
    connectWallet,
    isLoading,
    isInitializing,
    connectionError,
    clearError,
    selectedWallet,
    config,
  } = useWallet();

  // Track which specific wallet is being connected for UI feedback
  const [connectingWallet, setConnectingWallet] = React.useState<string | null>(null);
  // Track the last wallet that failed, so retry targets the correct one
  const [lastFailedWallet, setLastFailedWallet] = React.useState<string | null>(null);

  // Clear connecting state when modal closes or when global loading stops
  React.useEffect(() => {
    if (!open || !isLoading) {
      setConnectingWallet(null);
    }
  }, [open, isLoading]);

  // Clear last failed wallet when error is cleared
  React.useEffect(() => {
    if (!connectionError) {
      setLastFailedWallet(null);
    }
  }, [connectionError]);

  const handleConnect = async (extensionName: string) => {
    try {
      setConnectingWallet(extensionName);
      setLastFailedWallet(null);
      clearError();
      await connectWallet(extensionName);
      onOpenChange(false);
    } catch (error) {
      console.error('Connection failed in modal:', error);
      setLastFailedWallet(extensionName);
      // Error is handled by the store, modal stays open to show error
    } finally {
      setConnectingWallet(null);
    }
  };

  // Transform wallet data for WalletOption component
  const walletOptions = availableWallets.map(wallet => ({
    extensionName: wallet.extensionName,
    title: wallet.title,
    logo: wallet.logo
      ? {
          src: wallet.logo.src,
          alt: wallet.logo.alt || wallet.title,
        }
      : undefined,
    installed: !!wallet.installed,
    installUrl: config.installUrls[wallet.extensionName],
  }));

  const isRetryableError =
    connectionError &&
    (connectionError.includes('authorize') ||
      connectionError.includes('not authorised') ||
      connectionError.includes('timeout'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet extension to connect to your Autonomys wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Show initialization status */}
          {isInitializing && (
            <Alert variant="info">
              <AlertDescription>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="font-medium">Reconnecting to {selectedWallet}...</span>
                </div>
                <div className="text-xs mt-1">
                  Attempting to restore your previous wallet connection
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Connection error display */}
          {connectionError && (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium mb-1">Connection Failed</div>
                    <div className="whitespace-pre-line">{connectionError}</div>
                    {isRetryableError && (
                      <div className="mt-2 text-xs">
                        {connectionError.includes('timeout')
                          ? '\u23F1\uFE0F Connection timed out. Please try again and approve the request quickly.'
                          : '\uD83D\uDCA1 Make sure to approve the connection request in your wallet extension popup'}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-1 ml-2">
                    {isRetryableError && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          clearError();
                          if (lastFailedWallet) {
                            handleConnect(lastFailedWallet);
                          }
                        }}
                        disabled={isLoading}
                        className="h-auto px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearError}
                      className="h-auto p-0 hover:bg-gray-100"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* No wallets message */}
          {walletOptions.length === 0 && !isInitializing && (
            <div className="text-center text-gray-500 py-8">
              <p className="mb-4">No compatible wallets detected.</p>
              <p className="text-sm">Please install one of the supported wallet extensions:</p>
              <div className="mt-4 space-y-2">
                {Object.entries(config.installUrls).map(([name, url]) => (
                  <Button key={name} variant="outline" size="sm" asChild className="block">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      Install {name.charAt(0).toUpperCase() + name.slice(1)}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Wallet options */}
          {walletOptions.map(wallet => (
            <WalletOption
              key={wallet.extensionName}
              wallet={wallet}
              onConnect={handleConnect}
              isConnecting={connectingWallet === wallet.extensionName}
              disabled={
                isInitializing ||
                (connectingWallet !== null && connectingWallet !== wallet.extensionName)
              }
            />
          ))}

          {/* Terms notice */}
          {walletOptions.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500 text-center">
                By connecting a wallet, you agree to the Terms of Service and acknowledge that you
                have read and understand the Privacy Policy.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
