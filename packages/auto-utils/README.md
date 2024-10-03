# Autonomys Auto SDK Utility

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-utils.svg)](https://badge.fury.io/js/@autonomys%2Fauto-utils)

## Overview

The **Autonomys Auto SDK Utility** (`@autonomys/auto-utils`) provides core utility functions for interacting with the Autonomys Network. It offers functionalities for:

- **Wallet Management**: Initialize and manage wallets using mnemonics or URIs.
- **Network Configuration**: Access and manage network and domain settings.
- **Data Storage**: Save and read data to and from local storage or the file system.
- **Cryptographic Operations**: Perform hashing and data manipulation using cryptographic functions.
- **API Activation**: Activate and manage connections to the Autonomys Network APIs.
- **Address Utilities**: Convert and decode addresses to and from standardized formats.

This package serves as the foundational layer for building applications within the Autonomys ecosystem.

## Features

- **Easy Wallet Setup**: Quickly initialize wallets and manage accounts.
- **Flexible Network Management**: Choose between different networks and domains easily.
- **Secure Cryptographic Functions**: Utilize robust hashing and data handling functions.
- **Simplified API Activation**: Streamline connections to network APIs.
- **Data Persistence**: Easily save and retrieve data within your applications.
- **TypeScript Support**: Fully typed for enhanced developer experience.

## Installation

Install the package via npm or yarn:

```bash
# Using npm
npm install @autonomys/auto-utils

# Using yarn
yarn add @autonomys/auto-utils
```

## Getting Started

### Prerequisites

- **Node.js** (version 14 or higher)
- **TypeScript** (optional, but recommended for development)
- Familiarity with async/await and promise handling in JavaScript/TypeScript.

## Usage Examples

Below are examples demonstrating how to use the functions provided by `@autonomys/auto-utils`.

---

### 1. Wallet Management

#### **Activate a Wallet**

Activate a wallet using a mnemonic phrase:

```typescript
// Import necessary functions
import { activateWallet } from '@autonomys/auto-utils'
;(async () => {
  // Replace with your mnemonic
  const mnemonic = 'your mnemonic phrase here'

  // Activate the wallet
  const { api, accounts } = await activateWallet({
    mnemonic,
    networkId: 'gemini-3h', // Optional: specify the network ID
  })

  const account = accounts[0]
  console.log(`Connected with account address: ${account.address}`)

  // Perform actions with the account...

  // Disconnect when done
  await api.disconnect()
})()
```

**Parameters:**

- `mnemonic` (string): The mnemonic phrase of the wallet.
- `networkId` (string, optional): The ID of the network to connect to.

**Returns:**

- An object containing:
  - `api`: An instance of `ApiPromise` connected to the network.
  - `accounts`: An array of accounts derived from the mnemonic.

#### **Activate a Wallet Using URI**

You can also activate a wallet using a URI (e.g., `//Alice` for development purposes):

```typescript
import { activateWallet } from '@autonomys/auto-utils'
;(async () => {
  const { api, accounts } = await activateWallet({
    uri: '//Alice',
    networkId: 'localhost', // Connect to a local network
  })

  const account = accounts[0]
  console.log(`Connected with account address: ${account.address}`)

  // Disconnect when done
  await api.disconnect()
})()
```

#### **Create Mock Wallets for Testing**

Create mock wallets for testing purposes:

```typescript
import { activate, mockWallets, getMockWallet } from '@autonomys/auto-utils'
;(async () => {
  const api = await activate({ networkId: 'gemini-3h' })

  const wallets = await mockWallets({}, api)
  const aliceWallet = getMockWallet('Alice', wallets)
  const bobWallet = getMockWallet('Bob', wallets)

  console.log(`Alice's address: ${aliceWallet.accounts[0].address}`)
  console.log(`Bob's address: ${bobWallet.accounts[0].address}`)

  // Disconnect when done
  await api.disconnect()
})()
```

---

### 2. Network Management

#### **Get Available Networks**

List all available networks:

```typescript
import { networks } from '@autonomys/auto-utils'

networks.forEach((network) => {
  console.log(`Network ID: ${network.id}, Name: ${network.name}`)
})
```

#### **Get Network Details**

Retrieve details of a specific network:

```typescript
import { getNetworkDetails } from '@autonomys/auto-utils'

const network = getNetworkDetails({ networkId: 'gemini-3h' })
console.log(`Network Name: ${network.name}`)
console.log(`RPC URLs: ${network.rpcUrls.join(', ')}`)
```

#### **Get Domain Details**

Retrieve details of a specific domain within a network:

```typescript
import { getNetworkDomainDetails } from '@autonomys/auto-utils'

const domain = getNetworkDomainDetails({ domainId: '1', networkId: 'gemini-3h' })
console.log(`Domain Name: ${domain.name}`)
console.log(`RPC URLs: ${domain.rpcUrls.join(', ')}`)
```

---

### 3. Cryptographic Functions

#### **Hash Data Using BLAKE2b-256**

Hash a string using BLAKE2b-256:

```typescript
import { blake2b_256, stringToUint8Array } from '@autonomys/auto-utils'

const data = 'Hello, Autonomys!'
const dataBytes = stringToUint8Array(data)
const hash = blake2b_256(dataBytes)

console.log(`Hash: ${hash}`) // Outputs the hash of the input string
```

#### **Convert String to Uint8Array**

Convert a string to a `Uint8Array`:

```typescript
import { stringToUint8Array } from '@autonomys/auto-utils'

const text = 'Sample text'
const byteArray = stringToUint8Array(text)

console.log(byteArray) // Outputs Uint8Array representation of the string
```

#### **Concatenate Uint8Arrays**

Concatenate two `Uint8Array` instances:

```typescript
import { stringToUint8Array, concatenateUint8Arrays } from '@autonomys/auto-utils'

const array1 = stringToUint8Array('First part ')
const array2 = stringToUint8Array('Second part')

const concatenated = concatenateUint8Arrays(array1, array2)
console.log(`Concatenated Result: ${new TextDecoder().decode(concatenated)}`)
// Outputs: "First part Second part"
```

---

### 4. API Activation

#### **Activate the Network API**

Connect to the Autonomys Network:

```typescript
import { activate } from '@autonomys/auto-utils'
;(async () => {
  const api = await activate({ networkId: 'gemini-3h' })

  console.log('API connected')

  // Perform API calls...

  // Disconnect when done
  await api.disconnect()
})()
```

#### **Activate a Domain API**

Connect to a specific domain within the network:

```typescript
import { activateDomain } from '@autonomys/auto-utils'
;(async () => {
  const api = await activateDomain({ domainId: '1', networkId: 'gemini-3h' })

  console.log('Domain API connected')

  // Perform domain-specific API calls...

  // Disconnect when done
  await api.disconnect()
})()
```

---

### 5. Data Storage

#### **Save and Read Data**

Save data to local storage or the file system and read it back:

```typescript
import { save, read } from '@autonomys/auto-utils'

const key = 'myData'
const value = { message: 'Hello, Autonomys!' }

// Save data
save(key, value)

// Read data
const retrievedValue = read(key)
console.log(retrievedValue) // Outputs: { message: 'Hello, Autonomys!' }
```

---

### 6. Address Utilities

#### **Convert Address Formats**

Convert an address to a standardized format and decode it:

```typescript
import { address, decode } from '@autonomys/auto-utils'

const originalAddress = '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'
const standardizedAddress = address(originalAddress)
const decodedAddress = decode(originalAddress)

console.log(`Standardized Address: ${standardizedAddress}`)
console.log(`Decoded Address:`, decodedAddress)
```

---

## API Reference

### Wallet Management Functions

- **`setupWallet(params: MnemonicOrURI): KeyringPair`**: Initializes a wallet using a mnemonic or URI.

  - **Parameters**:

    - `params` (object):
      - `mnemonic` (string, optional): The mnemonic phrase.
      - `uri` (string, optional): The derivation path or URI.

  - **Returns**: `KeyringPair` - The initialized wallet key pair.

- **`activateWallet(params: ActivateWalletParams): Promise<WalletActivated>`**: Activates a wallet and returns API and accounts.

  - **Parameters**:

    - `params` (object):
      - `mnemonic` or `uri` (string): Wallet credentials.
      - `networkId` (string, optional): The network ID to connect to.

  - **Returns**:

    - **`api`**: Connected `ApiPromise` instance.
    - **`accounts`**: Array of derived accounts.

- **`mockWallets(network: NetworkParams | DomainParams, api: ApiPromise): Promise<WalletActivated[]>`**: Creates mock wallets for testing.

  - **Parameters**:

    - `network` (object): Network parameters.
    - `api` (`ApiPromise`): Connected API instance.

  - **Returns**: Array of `WalletActivated` - Mock wallets.

- **`getMockWallet(name: string, wallets: WalletActivated[]): WalletActivated`**: Retrieves a mock wallet by name.

  - **Parameters**:

    - `name` (string): Name of the mock wallet (e.g., 'Alice', 'Bob').
    - `wallets` (array): Array of `WalletActivated`.

  - **Returns**: A single `WalletActivated` matching the name.

---

### Network Management Functions

- **`getNetworkDetails(input?: NetworkParams): Network`**: Gets network details.

  - **Parameters**:

    - `input` (object, optional): Contains `networkId`.

  - **Returns**: `Network` - Network configuration object.

- **`getNetworkRpcUrls(input?: NetworkParams): string[]`**: Gets network RPC URLs.

  - **Parameters**:

    - `input` (object, optional): Contains `networkId`.

  - **Returns**: Array of RPC URL strings.

- **`getNetworkDomainDetails(params: DomainParams): Domain`**: Gets domain details.

  - **Parameters**:

    - `params` (object): Contains `domainId` and `networkId`.

  - **Returns**: `Domain` - Domain configuration object.

- **`getNetworkDomainRpcUrls(params: DomainParams): string[]`**: Gets domain RPC URLs.

  - **Parameters**:

    - `params` (object): Contains `domainId` and `networkId`.

  - **Returns**: Array of domain RPC URL strings.

---

### Data Storage Functions

- **`save(key: string, value: any): void`**: Saves data to local storage or file system.

  - **Parameters**:

    - `key` (string): Unique identifier for the data.
    - `value` (any): Data to be stored.

  - **Returns**: `void`

- **`read(key: string): any`**: Reads data from local storage or file system.

  - **Parameters**:

    - `key` (string): Unique identifier for the data.

  - **Returns**: The retrieved data.

---

### Cryptographic Functions

- **`blake2b_256(data: Uint8Array): string`**: Hashes data with BLAKE2b-256.

  - **Parameters**:

    - `data` (`Uint8Array`): Data to be hashed.

  - **Returns**: Hex string representation of the hash.

- **`stringToUint8Array(text: string): Uint8Array`**: Converts a string to a `Uint8Array`.

  - **Parameters**:

    - `text` (string): The input string.

  - **Returns**: `Uint8Array` representation of the string.

- **`concatenateUint8Arrays(array1: Uint8Array, array2: Uint8Array): Uint8Array`**: Concatenates two `Uint8Array` instances.

  - **Parameters**:

    - `array1` (`Uint8Array`)
    - `array2` (`Uint8Array`)

  - **Returns**: New `Uint8Array` resulting from concatenation.

---

### API Activation Functions

- **`activate(params?: ActivateParams<NetworkParams>): Promise<ApiPromise>`**: Activates the API for a network.

  - **Parameters**:

    - `params` (object, optional): Network activation parameters.

  - **Returns**: `ApiPromise` instance connected to the network.

- **`activateDomain(params: ActivateParams<DomainParams>): Promise<ApiPromise>`**: Activates the API for a domain.

  - **Parameters**:

    - `params` (object): Domain activation parameters.

  - **Returns**: `ApiPromise` instance connected to the domain.

- **`disconnect(api: ApiPromise): Promise<void>`**: Disconnects the API.

  - **Parameters**:

    - `api` (`ApiPromise`): The API instance to disconnect.

  - **Returns**: `void`

---

### Address Utilities

- **`address(address: string | Uint8Array): string`**: Converts an address to a standardized format.

  - **Parameters**:

    - `address` (string | `Uint8Array`): The original address.

  - **Returns**: Standardized address string.

- **`decode(address: string): Uint8Array`**: Decodes an address into a `Uint8Array`.

  - **Parameters**:

    - `address` (string): The address to decode.

  - **Returns**: `Uint8Array` representation of the address.

---

### Constants

- **`networks`**: Array of network configurations.

  ```typescript
  import { networks } from '@autonomys/auto-utils'

  // Example usage
  networks.forEach((network) => {
    console.log(network.id, network.name)
  })
  ```

- **`defaultNetwork`**: Default network configuration.

  ```typescript
  import { defaultNetwork } from '@autonomys/auto-utils'

  console.log(`Default Network: ${defaultNetwork.name}`)
  ```

- **`mockURIs`**: Array of mock URIs.

  ```typescript
  import { mockURIs } from '@autonomys/auto-utils'

  console.log(`Available mock URIs: ${mockURIs.join(', ')}`)
  ```

---

### Types

- **`Network`**, **`Domain`**, **`Explorer`**, **`NetworkParams`**, **`DomainParams`**
- **`Mnemonic`**, **`URI`**, **`AppName`**, **`MnemonicOrURI`**

These types are available for TypeScript users to ensure type safety and better development experience.

---

## Error Handling

When using `@autonomys/auto-utils`, it's important to handle potential errors, especially when dealing with asynchronous operations like network connections or wallet activations. Make use of `try/catch` blocks or handle promise rejections appropriately.

**Example:**

```typescript
import { activateWallet } from '@autonomys/auto-utils'
;(async () => {
  try {
    const { api, accounts } = await activateWallet({
      mnemonic: 'your mnemonic',
    })

    // Proceed with using the api and accounts
  } catch (error) {
    console.error('Error activating wallet:', error)
  }
})()
```

---

## Contributing

We welcome community contributions! If you wish to contribute to `@autonomys/auto-utils`, please follow these guidelines:

1. **Fork the repository** on GitHub.

2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/your-username/auto-sdk.git
   cd auto-sdk/packages/auto-utils
   ```

3. **Install dependencies**:

   ```bash
   yarn install
   ```

4. **Make your changes** and ensure all tests pass:

   ```bash
   yarn test
   ```

5. **Commit your changes** with clear and descriptive messages.

6. **Push to your fork** and **create a pull request** against the `main` branch of the original repository.

### Code Style

- Use **TypeScript** for all code.
- Follow the existing coding conventions.
- Run `yarn lint` to ensure code style consistency.

### Testing

- Add tests for any new features or bug fixes.
- Ensure all existing tests pass.

---

## License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.

---

## Additional Resources

- **Autonomys Academy**: Learn more about the Autonomys SDK and the vision behind it at [Autonomys Academy](https://academy.autonomys.xyz).

## Contact

If you have any questions or need support, feel free to reach out:

- **GitHub Issues**: [GitHub Issues Page](https://github.com/autonomys/auto-sdk/issues)

We appreciate your feedback and contributions!
