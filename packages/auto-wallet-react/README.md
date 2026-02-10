# Autonomys Auto Wallet React SDK

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-wallet-react.svg)](https://badge.fury.io/js/@autonomys%2Fauto-wallet-react)

## Overview

The **Autonomys Auto Wallet React SDK** (`@autonomys/auto-wallet-react`) provides ready-to-use React components and hooks for wallet connection in Autonomys Network dApps. It offers:

- **Provider Component**: `WalletProvider` wraps your app and configures the wallet store via React context.
- **Hook**: `useWallet()` gives access to wallet state, actions, and computed properties from any component.
- **UI Components**: Pre-built `WalletButton`, `WalletModal`, and `WalletOption` components styled with Tailwind CSS and shadcn/ui patterns.

Built on top of [`@autonomys/auto-wallet`](../auto-wallet/README.md) for framework-agnostic core logic.

## Features

- **Drop-In Wallet UI**: A connect/disconnect button and wallet selection modal that work out of the box.
- **Per-App Configuration**: Configure dApp name, SS58 prefix, supported wallets, and more via `WalletProvider`.
- **Auto-Reconnection**: Automatically reconnects to the last used wallet on page reload.
- **Multi-Wallet Support**: Talisman, SubWallet, and Polkadot.js supported by default with install links for missing wallets.
- **Theming via CSS Variables**: Components use shadcn/ui-style Tailwind classes that adapt to your app's theme.
- **TypeScript Support**: Fully typed for enhanced developer experience.

## Installation

Install the package and its peer dependencies:

```bash
# Using npm
npm install @autonomys/auto-wallet-react @autonomys/auto-wallet zustand

# Using yarn
yarn add @autonomys/auto-wallet-react @autonomys/auto-wallet zustand
```

## Getting Started

### Prerequisites

- **React** (>=18.0.0) and **React DOM** (>=18.0.0)
- **Tailwind CSS** (v3.x) configured in your project
- **shadcn/ui CSS variables** defined in your global CSS (see [Styling Setup](#styling-setup))
- **`tailwindcss-animate`** plugin installed

### Quick Start

1. **Wrap your app with `WalletProvider`:**

```tsx
import { WalletProvider } from '@autonomys/auto-wallet-react'

function App() {
  return (
    <WalletProvider config={{
      dappName: 'My dApp',
      ss58Prefix: 6094,
    }}>
      <YourApp />
    </WalletProvider>
  )
}
```

2. **Add the wallet button and modal to your layout:**

```tsx
import { useState } from 'react'
import { WalletButton, WalletModal } from '@autonomys/auto-wallet-react'

function Header() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <header>
      <WalletButton onOpenModal={() => setModalOpen(true)} />
      <WalletModal open={modalOpen} onOpenChange={setModalOpen} />
    </header>
  )
}
```

3. **Access wallet state anywhere in your app:**

```tsx
import { useWallet } from '@autonomys/auto-wallet-react'

function MyComponent() {
  const { isConnected, selectedAccount, injector } = useWallet()

  if (!isConnected) {
    return <p>Please connect your wallet.</p>
  }

  return <p>Connected as {selectedAccount?.name}</p>
}
```

### Styling Setup

The wallet components use Tailwind CSS utility classes that reference CSS custom properties (e.g., `bg-primary`, `text-foreground`). Your consuming app must define these variables.

**1. Add the package to your Tailwind content config:**

```js
// tailwind.config.js
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@autonomys/auto-wallet-react/dist/**/*.{js,mjs}",
  ],
  // ...
}
```

**2. Define shadcn/ui CSS variables in your global CSS:**

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
}
```

**3. Install the `tailwindcss-animate` plugin:**

```bash
yarn add -D tailwindcss-animate
```

```js
// tailwind.config.js
plugins: [require("tailwindcss-animate")],
```

## Usage Examples

### Custom Configuration

```tsx
import { WalletProvider } from '@autonomys/auto-wallet-react'

function App() {
  return (
    <WalletProvider config={{
      dappName: 'Autonomys Staking Portal',
      ss58Prefix: 6094,
      storageKey: 'staking-portal-wallet',
      supportedWallets: ['talisman', 'subwallet-js'],
      connectionTimeout: 15000,
    }}>
      <YourApp />
    </WalletProvider>
  )
}
```

### Using the Wallet Hook

```tsx
import { useWallet } from '@autonomys/auto-wallet-react'

function StakingForm() {
  const {
    isConnected,
    isConnecting,
    selectedAccount,
    accounts,
    injector,
    connectionError,
    connectWallet,
    disconnectWallet,
    selectAccount,
  } = useWallet()

  if (connectionError) {
    return <p>Error: {connectionError}</p>
  }

  if (!isConnected) {
    return (
      <button onClick={() => connectWallet('talisman')}>
        {isConnecting ? 'Connecting...' : 'Connect Talisman'}
      </button>
    )
  }

  return (
    <div>
      <p>Connected: {selectedAccount?.address}</p>
      <select onChange={(e) => selectAccount(e.target.value)}>
        {accounts.map((acc) => (
          <option key={acc.address} value={acc.address}>
            {acc.name || acc.address}
          </option>
        ))}
      </select>
      <button onClick={disconnectWallet}>Disconnect</button>
    </div>
  )
}
```

### Using the Injector for Transactions

The `injector` from `useWallet()` can be used to sign and submit extrinsics with `@polkadot/api`:

```tsx
import { useWallet } from '@autonomys/auto-wallet-react'

function SubmitTransaction() {
  const { selectedAccount, injector } = useWallet()

  const handleSubmit = async () => {
    if (!selectedAccount || !injector) return

    // Use injector.signer with @polkadot/api
    await api.tx.balances
      .transferKeepAlive(recipient, amount)
      .signAndSend(selectedAccount.address, { signer: injector.signer })
  }

  return <button onClick={handleSubmit}>Send</button>
}
```

## API Reference

### Components

#### **`WalletProvider`**

Wraps your application and provides wallet state via React context.

```tsx
<WalletProvider config={{ dappName: 'My dApp' }}>
  {children}
</WalletProvider>
```

- **Props:**
  - `config` (`Partial<WalletConfig>`, optional): Configuration overrides. See [`WalletConfig`](../auto-wallet/README.md#configuration) for available options.
  - `children` (`React.ReactNode`): Your application tree.

#### **`WalletButton`**

A connect/disconnect button that shows the connected account's name and address, or a "Connect Wallet" prompt.

```tsx
<WalletButton onOpenModal={() => setModalOpen(true)} />
```

- **Props:**
  - `onOpenModal` (`() => void`, optional): Callback to open the wallet selection modal.

#### **`WalletModal`**

A dialog modal for selecting and connecting to a wallet extension. Shows installed wallets, connection status, account selection, and install links for missing wallets.

```tsx
<WalletModal open={modalOpen} onOpenChange={setModalOpen} />
```

- **Props:**
  - `open` (`boolean`): Whether the modal is open.
  - `onOpenChange` (`(open: boolean) => void`): Callback when the modal's open state changes.

#### **`WalletOption`**

An individual wallet option row used inside `WalletModal`. Can be used standalone for custom modal layouts.

- **Props:**
  - `wallet` (`Wallet`): The wallet extension object.
  - `onConnect` (`(name: string) => void`): Callback when the user clicks connect.
  - `isConnecting` (`boolean`): Whether this wallet is currently connecting.
  - `disabled` (`boolean`): Whether the option is disabled.

### Hooks

#### **`useWallet()`**

React hook for accessing wallet state and actions. Must be used within a `<WalletProvider>`.

Auto-detects installed wallet extensions on mount.

**Returns:**

| Property | Type | Description |
|---|---|---|
| `isConnected` | `boolean` | Whether a wallet is connected |
| `isLoading` | `boolean` | Whether a connection is in progress |
| `loadingType` | `LoadingType` | `'connecting'`, `'initializing'`, or `null` |
| `connectionError` | `string \| null` | Error message from last failed connection |
| `selectedWallet` | `string \| null` | Name of connected wallet extension |
| `selectedAccount` | `WalletAccount \| null` | Active account |
| `accounts` | `WalletAccount[]` | All accounts from connected wallet |
| `availableWallets` | `Wallet[]` | Detected wallet extensions |
| `injector` | `InjectedExtension \| null` | Wallet injector for signing transactions |
| `config` | `Required<WalletConfig>` | Resolved configuration |
| `connectWallet` | `(name: string) => Promise<void>` | Connect to a wallet |
| `disconnectWallet` | `() => void` | Disconnect current wallet |
| `selectAccount` | `(address: string) => void` | Switch active account |
| `clearError` | `() => void` | Clear connection error |
| `hasWallets` | `boolean` | Whether any wallet extensions are installed |
| `selectedAddress` | `string \| null` | Shortcut to selected account address |
| `isConnecting` | `boolean` | Whether currently connecting (not initializing) |
| `isInitializing` | `boolean` | Whether currently auto-reconnecting |
| `canConnect` | `boolean` | Whether a new connection can be initiated |

**Performance note:** `useWallet()` subscribes to the entire store, so any state change will re-render all consumers. For most wallet UIs this is perfectly fine. If you need fine-grained subscriptions (e.g., in a performance-critical component that only reads `selectedAccount`), you can access the underlying Zustand store directly via `useWalletStore()` with a selector:

```tsx
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

// Only re-renders when selectedAccount changes
const selectedAccount = useStore(store, (s) => s.selectedAccount)

// Or pick multiple fields with shallow comparison
const { isConnected, selectedAccount } = useStore(
  store,
  useShallow((s) => ({ isConnected: s.isConnected, selectedAccount: s.selectedAccount })),
)
```

### Re-exports

For convenience, the following are re-exported from `@autonomys/auto-wallet`:

- `shortenAddress`
- `DEFAULT_WALLET_CONFIG`
- Types: `WalletConfig`, `WalletState`, `WalletConnectionStatus`, `LoadingType`, `WalletAccount`, `InjectedExtension`

## Error Handling

Connection errors are captured in the store and accessible via `useWallet()`:

```tsx
const { connectionError, clearError } = useWallet()

if (connectionError) {
  return (
    <div>
      <p>Connection failed: {connectionError}</p>
      <button onClick={clearError}>Dismiss</button>
    </div>
  )
}
```
