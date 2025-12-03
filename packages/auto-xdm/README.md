# Autonomys Auto XDM SDK

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-xdm.svg)](https://badge.fury.io/js/@autonomys%2Fauto-xdm)

## Overview

The **Autonomys Auto XDM SDK** (`@autonomys/auto-xdm`) provides functionalities for cross-domain transfer of native tokens.

## Features

- **Cross-Domain Transfer**: Transfer tokens between consensus and domain accounts.
- **EVM Precompile Support**: Transfer from EVM domains to consensus using the Transporter Precompile.
- **TypeScript Support**: Fully typed for enhanced developer experience.

## Installation

Install the package via npm or yarn:

```bash
# Using npm
npm install @autonomys/auto-xdm

# Using yarn
yarn add @autonomys/auto-xdm
```

## Getting Started

### Prerequisites

- **Node.js** (version 14 or higher)
- **TypeScript** (optional, but recommended for development)
- Familiarity with async/await and promise handling in JavaScript/TypeScript.
- **@autonomys/auto-utils** package installed (as it provides utility functions and API activation).

## Usage Examples

Below are examples demonstrating how to use the functions provided by `@autonomys/auto-xdm`.

### 1. Transfer from Consensus to Domain using an EVM address

```ts
import { activateWallet } from '@autonomys/auto-utils'
import { transporterTransfer } from '@autonomys/auto-xdm'

const api = await activateWallet({ networkId: 'taurus', uri: '//alice' })
const tx = transporterTransfer(
  api,
  { domainId: 0 }, // Receiver domain (0 is Auto EVM on Taurus Testnet)
  { accountId20: '0x1234567890abcdef1234567890abcdef12345678' }, // Receiver domain account (EVM address)
  '1000000000000000000',
)
```

### 2. Transfer from Consensus to Domain using a Substrate address

```ts
import { activateWallet } from '@autonomys/auto-utils'
import { transporterTransfer } from '@autonomys/auto-xdm'

const api = await activateWallet({ networkId: 'taurus', uri: '//alice' })
const tx = transporterTransfer(
  api,
  { domainId: 0 }, // Receiver domain (0 is Auto EVM on Taurus Testnet)
  { accountId32: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' }, // Receiver domain account (Substrate address)
  '1000000000000000000',
)
```

### 3. Transfer from Domain to Consensus (Substrate RPC)

```ts
import { activateWallet } from '@autonomys/auto-utils'
import { transporterTransfer } from '@autonomys/auto-xdm'

const api = await activateWallet({ networkId: 'taurus', domainId: 0, uri: '//alice' })
const tx = transporterTransfer(
  api,
  'consensus', // Destination is consensus chain
  { accountId32: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' }, // Receiver consensus account (Substrate address)
  '1000000000000000000',
)
```

### 4. Transfer from EVM Domain to Consensus (Precompile)

The Transporter Precompile allows EVM users to transfer funds to the consensus chain without using Substrate RPCs. This is useful for:

- EVM-native wallets (MetaMask, WalletConnect, etc.)
- Smart contracts that need to bridge funds
- Applications that only interact with EVM JSON-RPC

**Note:** To use precompile functions, install `ethers` as a peer dependency:

```bash
npm install ethers
# or
yarn add ethers
```

```ts
import { JsonRpcProvider, Wallet } from 'ethers'
import {
  transferToConsensus,
  getMinimumTransferAmount,
  TRANSPORTER_PRECOMPILE_ADDRESS,
} from '@autonomys/auto-xdm'

// Setup provider and wallet
const provider = new JsonRpcProvider('https://auto-evm.mainnet.autonomys.xyz/ws')
const wallet = new Wallet(privateKey, provider)

// Check minimum transfer amount
const minAmount = await getMinimumTransferAmount(provider)
console.log(`Minimum transfer: ${minAmount / 10n ** 18n} AI3`)

// Transfer 10 AI3 to a consensus account
const result = await transferToConsensus(
  wallet,
  'sufsKsx4kZ26i7bJXc1TFguysVzjkzsDtE2VDiCEBY2WjyGAj', // Recipient SS58 address
  10n * 10n ** 18n, // 10 AI3 in wei
)

console.log(`Transfer tx: ${result.transactionHash}`)
console.log(`Block: ${result.blockNumber}`)
```

### 5. Low-level Precompile Access

For more control, you can create the transaction data manually:

```ts
import { Contract } from 'ethers'
import {
  createTransferToConsensusTxData,
  encodeAccountId32ToBytes32,
  getTransporterPrecompileAbi,
  TRANSPORTER_PRECOMPILE_ADDRESS,
} from '@autonomys/auto-xdm'

// Option A: Create raw transaction data
const txData = createTransferToConsensusTxData(
  'sufsKsx4kZ26i7bJXc1TFguysVzjkzsDtE2VDiCEBY2WjyGAj',
  10n * 10n ** 18n,
)

// Use for gas estimation
const gasEstimate = await provider.estimateGas({ ...txData, from: wallet.address })

// Option B: Use ethers Contract directly
const contract = new Contract(
  TRANSPORTER_PRECOMPILE_ADDRESS,
  getTransporterPrecompileAbi(),
  wallet,
)

const accountId32 = encodeAccountId32ToBytes32('sufsKsx4kZ26i7bJXc1TFguysVzjkzsDtE2VDiCEBY2WjyGAj')
const tx = await contract.transfer_to_consensus_v1(accountId32, 10n * 10n ** 18n)
await tx.wait()
```
