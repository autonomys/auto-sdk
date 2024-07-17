# Autonomys Auto SDK Utility

## Overview

The Autonomys Auto SDK Utility provides functionalities for wallet setup, network management, data storage, cryptographic operations, and API activation.

## Wallet Management

- `setupWallet(params: MnemonicOrURI): Promise<KeyringPair>`: Initializes a wallet using a mnemonic or URI.
- `activateWallet(params: ActivateWalletParams): Promise<WalletActivated>`: Activates a wallet and returns API and accounts.
- `mockWallets(network: NetworkParams | DomainParams): Promise<WalletActivated[]>`: Creates mock wallets for testing.
- `getMockWallet(name: string, wallets: WalletActivated[]): WalletActivated`: Retrieves a mock wallet by name.

## Network Management

- `getNetworkDetails(input?: NetworkParams): Network`: Gets network details.
- `getNetworkRpcUrls(input?: NetworkParams): string[]`: Gets network RPC URLs.
- `getNetworkDomainDetails(params: DomainParams): Domain`: Gets domain details.
- `getNetworkDomainRpcUrls(params: DomainParams): string[]`: Gets domain RPC URLs.

## Data Storage

- `save(key: string, value: any)`: Saves data to local storage or file system.
- `read(key: string): any`: Reads data from local storage or file system.

## Cryptographic Functions

- `blake2b_256(data: Uint8Array): string`: Hashes data with BLAKE2b-256.
- `stringToUint8Array(text: string): Uint8Array`: Converts a string to a Uint8Array.
- `concatenateUint8Arrays(array1: Uint8Array, array2: Uint8Array): Uint8Array`: Concatenates two Uint8Arrays.

## API Activation

- `activate(input?: NetworkParams): Promise<ApiPromise>`: Activates the API for a network.
- `activateDomain(params: DomainParams): Promise<ApiPromise>`: Activates the API for a domain.
- `disconnect()`: Disconnects the API.
- `disconnectDomain()`: Disconnects the domain API.

## Constants

- `networks`: Array of network configurations.
- `defaultNetwork`: Default network configuration.
- `mockURIs`: Array of mock URIs.

## Types

- `Network`, `Domain`, `Explorer`, `NetworkParams`, `DomainParams`
- `Mnemonic`, `URI`, `AppName`, `MnemonicOrURI`

For more details, refer to the source files in the `src` directory.

## Import Example

```typescript
import { activateWallet } from '@autonomys/auto-utils'
```
