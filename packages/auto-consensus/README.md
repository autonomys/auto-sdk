# Autonomys Auto Consensus SDK

## Overview

The Autonomys Auto Consensus SDK provides functionalities for blockchain consensus interactions, including address management, balance retrieval, staking, and transfers.

## Address Management

- `generateAddress(params: MnemonicOrURI): string`: Generates a new address.

## Balances

- `getBalance(address: string): Promise<Balance>`: Retrieves the balance of an address.

## Staking

- `stake(address: string, amount: number): Promise<void>`: Stakes an amount from an address.

## Transfers

- `transfer(from: string, to: string, amount: number): Promise<void>`: Transfers an amount from one address to another.

## Info

- `getInfo(): Promise<Info>`: Retrieves blockchain information.

## Import Example

```typescript
import { generateAddress, getBalance, stake, transfer, getInfo } from '@autonomys/auto-consensus'
```
