# Autonomys Auto XDM SDK

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-xdm.svg)](https://badge.fury.io/js/@autonomys%2Fauto-xdm)

## Overview

The **Autonomys Auto XDM SDK** (`@autonomys/auto-xdm`) provides functionalities for cross-domain transfer of native tokens.

## Features

- **Cross-Domain Transfer**: Transfer tokens between consensus and domain accounts.
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
import { transferToDomainAccount20Type } from '@autonomys/auto-xdm'

const api = await activateWallet({ networkId: 'taurus', uri: '//alice' })
const tx = await transferToDomainAccount20Type(
  api,
  0, // Receiver domain (0 is Auto EVM on Taurus Testnet)
  '0x1234567890abcdef', // Receiver domain account
  '1000000000000000000',
)
```

### 2. Transfer from Consensus to Domain using an substrate address

```ts
import { activateWallet } from '@autonomys/auto-utils'
import { transferToDomainAccount32Type } from '@autonomys/auto-xdm'

const api = await activateWallet({ networkId: 'taurus', uri: '//alice' })
const tx = await transferToDomainAccount32Type(
  api,
  0, // Receiver domain (0 is Auto EVM on Taurus Testnet)
  'su1234567890abcdef', // Receiver domain account
  '1000000000000000000',
)
```

### 3. Transfer from Domain to Consensus

```ts
import { activateWallet } from '@autonomys/auto-utils'
import { transferToConsensus } from '@autonomys/auto-xdm'

const api = await activateWallet({ networkId: 'taurus', domainId: 0, uri: '//alice' })
const tx = await transferToConsensus(
  api,
  'su1234567890abcdef', // Receiver consensus account,
  '1000000000000000000',
)
```
