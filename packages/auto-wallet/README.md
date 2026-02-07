# Autonomys Auto Wallet SDK

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-wallet.svg)](https://badge.fury.io/js/@autonomys%2Fauto-wallet)

## Overview

The **Autonomys Auto Wallet SDK** (`@autonomys/auto-wallet`) provides framework-agnostic wallet connection logic for Autonomys Network dApps. It offers:

- **Wallet Detection**: Discover installed Substrate wallet extensions (Talisman, SubWallet, Polkadot.js).
- **Wallet Connection**: Connect to and disconnect from browser wallet extensions with timeout handling.
- **Account Management**: List accounts, select active accounts, and format addresses with configurable SS58 prefixes.
- **State Management**: A Zustand store factory with persistence, auto-reconnection, and error handling.
- **Per-App Configuration**: All settings (dApp name, SS58 prefix, supported wallets, etc.) are configurable with sensible defaults.

This package is the foundation for `@autonomys/auto-wallet-react` and can also be used standalone with any JavaScript framework.

## Features

- **Configurable Store Factory**: Create isolated wallet stores with per-app configuration via `createWalletStore(config)`.
- **Multi-Wallet Support**: Detect and connect to Talisman, SubWallet, and Polkadot.js out of the box.
- **Persistent State**: Automatically saves and restores wallet preferences across sessions using `localStorage`.
- **Auto-Reconnection**: Reconnects to the previously selected wallet and account on page reload.
- **Timeout Handling**: Configurable connection timeouts with proper cleanup.
- **Address Formatting**: Format addresses with configurable SS58 prefixes for any Substrate chain.
- **TypeScript Support**: Fully typed for enhanced developer experience.

## Installation

Install the package via npm or yarn:

```bash
# Using npm
npm install @autonomys/auto-wallet

# Using yarn
yarn add @autonomys/auto-wallet
```

## Getting Started

### Prerequisites

- **Node.js** (version 14 or higher)
- **TypeScript** (optional, but recommended)
- A browser environment with Substrate wallet extensions installed (for wallet detection)

### Peer Dependencies

- `zustand` (>=5.0.0) must be installed in your project.

## Usage Examples

### 1. Basic Store Creation

Create a wallet store with default configuration:

```typescript
import { createWalletStore } from '@autonomys/auto-wallet'

const useWalletStore = createWalletStore()

// Access state
const state = useWalletStore.getState()
console.log(`Connected: ${state.isConnected}`)
```

### 2. Custom Configuration

Configure the store for your specific dApp and chain:

```typescript
import { createWalletStore } from '@autonomys/auto-wallet'

const useWalletStore = createWalletStore({
  dappName: 'My Autonomys dApp',
  ss58Prefix: 42,                    // Use testnet prefix
  storageKey: 'my-dapp-wallet',      // Custom localStorage key
  connectionTimeout: 15000,          // 15 second timeout
  supportedWallets: ['talisman'],    // Only support Talisman
})
```

### 3. Connecting a Wallet

```typescript
import { createWalletStore } from '@autonomys/auto-wallet'

const useWalletStore = createWalletStore()
const { connectWallet, disconnectWallet, detectWallets } = useWalletStore.getState()

// Detect installed wallets
detectWallets()

// Connect to a specific wallet
await connectWallet('talisman')

// Check connected accounts
const { accounts, selectedAccount } = useWalletStore.getState()
console.log(`Selected account: ${selectedAccount?.address}`)

// Disconnect
disconnectWallet()
```

### 4. Address Utilities

```typescript
import { shortenAddress } from '@autonomys/auto-wallet'

const address = '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'
console.log(shortenAddress(address))     // "5GmS…W6A8"
console.log(shortenAddress(address, 6))  // "5GmS1w…oLW6A8"
```

## API Reference

### Factory Function

#### **`createWalletStore(config?: Partial<WalletConfig>): UseBoundStore<StoreApi<WalletState>>`**

Creates a new Zustand wallet store with the given configuration merged with defaults.

- **Parameters:**
  - `config` (`Partial<WalletConfig>`, optional): Configuration overrides.
- **Returns:** A Zustand store instance.

### Configuration

#### **`WalletConfig`**

All fields are optional with sensible defaults:

| Field | Type | Default | Description |
|---|---|---|---|
| `dappName` | `string` | `'Autonomys'` | Name shown when requesting wallet connection |
| `storageKey` | `string` | `'autonomys-wallet-preferences'` | localStorage key for persisting preferences |
| `ss58Prefix` | `number` | `6094` | SS58 address prefix (6094 = Autonomys mainnet) |
| `supportedWallets` | `string[]` | `['talisman', 'subwallet-js', 'polkadot-js']` | Wallet extension names to detect |
| `connectionTimeout` | `number` | `30000` | Connection timeout in milliseconds |
| `installUrls` | `Record<string, string>` | Chrome Web Store links | Map of wallet name to install URL |

### Store State

#### **`WalletState`**

The store state returned by `createWalletStore()`:

**State Fields:**

- `isConnected` (`boolean`): Whether a wallet is currently connected.
- `isLoading` (`boolean`): Whether a connection or initialization is in progress.
- `loadingType` (`LoadingType`): `'connecting'`, `'initializing'`, or `null`.
- `connectionError` (`string | null`): Error message from the last failed connection attempt.
- `selectedWallet` (`string | null`): Name of the currently connected wallet extension.
- `selectedAccount` (`WalletAccount | null`): The active account.
- `accounts` (`WalletAccount[]`): All accounts from the connected wallet.
- `injector` (`InjectedExtension | null`): The wallet's injected extension (for signing transactions).
- `availableWallets` (`Wallet[]`): Installed wallet extensions detected in the browser.
- `config` (`Required<WalletConfig>`): The resolved configuration with all defaults applied.

**Actions:**

- `connectWallet(extensionName: string): Promise<void>`: Connect to a wallet extension by name.
- `disconnectWallet(): void`: Disconnect the current wallet and clear state.
- `selectAccount(address: string): void`: Switch the active account by address.
- `clearError(): void`: Clear the current connection error.
- `detectWallets(): void`: Re-scan for installed wallet extensions.
- `initializeConnection(): Promise<void>`: Reconnect to a previously saved wallet (called automatically on rehydration).

### Utility Functions

#### **`connectToWallet(extensionName: string, config: Required<WalletConfig>)`**

Low-level function to connect to a wallet extension. Used internally by the store.

- **Parameters:**
  - `extensionName` (`string`): The wallet extension name (e.g., `'talisman'`).
  - `config` (`Required<WalletConfig>`): Resolved wallet configuration.
- **Returns:** `Promise<{ accounts: WalletAccount[]; injector: InjectedExtension }>` or throws on error.

#### **`shortenAddress(address?: string | null, length?: number): string`**

Shorten a Substrate address for display.

- **Parameters:**
  - `address` (`string`, optional): The full address.
  - `length` (`number`, optional): Number of characters to keep on each side. Default: `4`.
- **Returns:** Shortened address string (e.g., `"5GmS…W6A8"`) or empty string if no address provided.

### Constants

#### **`DEFAULT_WALLET_CONFIG`**

The default configuration object used when no overrides are provided:

```typescript
import { DEFAULT_WALLET_CONFIG } from '@autonomys/auto-wallet'

console.log(DEFAULT_WALLET_CONFIG.dappName)       // 'Autonomys'
console.log(DEFAULT_WALLET_CONFIG.ss58Prefix)     // 6094
console.log(DEFAULT_WALLET_CONFIG.supportedWallets) // ['talisman', 'subwallet-js', 'polkadot-js']
```

### Types

- **`WalletConfig`**: Configuration interface for the wallet store.
- **`WalletState`**: Full store state including actions.
- **`WalletConnectionStatus`**: Union type: `'disconnected' | 'connecting' | 'initializing' | 'connected' | 'error'`.
- **`LoadingType`**: `'connecting' | 'initializing' | null`.
- **`Wallet`**: Re-exported from `@talismn/connect-wallets`.
- **`WalletAccount`**: Re-exported from `@talismn/connect-wallets`.
- **`InjectedExtension`**: Re-exported from `@polkadot/extension-inject/types`.

## Error Handling

The store manages connection errors internally and exposes them via `connectionError`. You can also handle errors when calling actions directly:

```typescript
const store = createWalletStore()

try {
  await store.getState().connectWallet('talisman')
} catch (error) {
  console.error('Connection failed:', error)
}

// Or read the error from state
const { connectionError } = store.getState()
if (connectionError) {
  console.error('Stored error:', connectionError)
}
```
