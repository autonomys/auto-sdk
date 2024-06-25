# Autonomys SDK - TypeScript

Welcome to the Autonomys SDK! This README provides an overview of the SDK's functionalities, including wallet setup, network management, data storage, and cryptographic operations. Each section provides a brief description of the included functions and their usage.

## Table of Contents

1. Wallet Management
2. Network Management
3. Data Storage
4. Cryptographic Functions
5. API Activation
6. Constants
7. Types

## Wallet Management

### setupWallet

Sets up a wallet using a mnemonic or URI.

```typescript
export const setupWallet = async (input: MnemonicOrURI): Promise<KeyringPair>
```

- input: The mnemonic or URI used to set up the wallet.
- Returns a KeyringPair.

#### activateWallet

Activates a wallet for a given network or domain and returns API and accounts.

```typescript
export const activateWallet = async (input: ActivateWalletInput): Promise<WalletActivated>
```

- input: Network or domain input along with mnemonic or URI and app name.
- Returns an object containing api and accounts.

#### mockWallets

Creates mock wallets for a given network or domain.

```typescript
export const mockWallets = async (network: NetworkInput | DomainInput): Promise<WalletActivated[]>
```

- network: Network or domain input.
- Returns an array of WalletActivated objects.

#### getMockWallet

Retrieves a mock wallet by name.

```typescript
export const getMockWallet = (name: string, wallets: WalletActivated[]): WalletActivated
```

- name: Name of the mock wallet.
- wallets: Array of activated wallets.
- Returns a WalletActivated object.

### Network Management

#### getNetworkDetails

Retrieves details of a specified network.

```typescript
export const getNetworkDetails = (input?: NetworkInput) => Network
```

- input: Network input.
- Returns network details.

#### getNetworkRpcUrls

Retrieves RPC URLs for a specified network.

```typescript
export const getNetworkRpcUrls = (input?: NetworkInput) => string[]
```

- input: Network input.
- Returns an array of RPC URLs.

#### getNetworkDomainDetails

Retrieves details of a specified network domain.

```typescript
export const getNetworkDomainDetails = (input: DomainInput) => Domain
```

- input: Domain input.
- Returns domain details.

#### getNetworkDomainRpcUrls

Retrieves RPC URLs for a specified network domain.

```typescript
export const getNetworkDomainRpcUrls = (input: DomainInput) => string[]
```

- input: Domain input.
- Returns an array of RPC URLs.
