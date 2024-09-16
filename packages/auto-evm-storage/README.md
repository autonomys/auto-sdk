# @autonomys/auto-emv-storage

A comprehensive npm package for deploying and interacting with various data structure smart contracts on Autonomys Nova (EVM) domains. This package provides a simple and efficient way to manage different types of data structures on the blockchain.

## Features

- Easy deployment and interaction with multiple smart contract data structures:

  - AutoKeyValue: Key-value store with role-based access control
  - AutoEnumerableMap: Enumerable map with key-value pairs
  - AutoMultiMap: Multi-map allowing multiple values per key
  - AutoLinkedList: Linked list implementation
  - AutoStackQueue: Combined stack and queue data structure
  - AutoEventLogger: Event logging and retrieval system

- Simple TypeScript API for interacting with each data structure
- Role-based access control for writers and editors (where applicable)
- Seamless integration with Ethereum-compatible networks

## Installation

To install the package, use npm or yarn:

```bash
npm install @autonomys/auto-evm-storage
# or
yarn add @autonomys/auto-evm-storage
```

## Usage

### AutoKeyValue

The `AutoKeyValue` contract is a key-value store with role-based access control. It allows for setting and retrieving values associated with specific keys.

#### Deployment

To deploy the `AutoKeyValue` contract, use the following TypeScript code:

```typescript
import { AutoKeyValue } from '@autonomys/auto-evm-storage'

const autoKeyValue = new AutoKeyValue(provider)
```

#### Setting and Retrieving Values

To set a value for a key, use the `setValue` method:

```typescript
const value = await autoKeyValue.setValue('key', 'value')
```

To retrieve a value for a key, use the `getValue` method:

```typescript
const value = await autoKeyValue.getValue('key')
```

### AutoEnumerableMap

The `AutoEnumerableMap` contract is an enumerable map with key-value pairs. It allows for setting and retrieving values associated with specific keys.
