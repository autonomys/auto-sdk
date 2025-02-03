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

### Importing the SDK

You can import specific functions from the package as needed:

```typescript
import { transfer } from '@autonomys/auto-xdm'
```

## Usage Examples

Below are examples demonstrating how to use the functions provided by `@autonomys/auto-xdm`.

### 1. Transfer from Consensus to Domain

```ts
import { activate } from '@autonomys/auto-utils'
import { transfer } from '@autonomys/auto-xdm'

const api = await activate({ networkId: 'taurus' })
const tx = await transfer(
  api,
  {
    type: 'domain',
    domainId: 0, // Receiver domain (0 is Auto EVM on Taurus Testnet)
  },
  receiver: {
    accountId20: '0x1234567890abcdef', // Receiver domain account
  },
  amount: '1000000000000000000',
)
```

### 2. Transfer from Domain to Consensus

```ts
import { activateDomain } from '@autonomys/auto-utils'
import { transfer } from '@autonomys/auto-xdm'

const api = await activateDomain({ networkId: 'taurus', domainId: 0 })
const tx = await transfer(
  api,
  {
    type: 'consensus'
  },
  receiver: {
    accountId32: 'su1234567890abcdef', // Receiver consensus account
  },
  amount: '1000000000000000000',
)
```
