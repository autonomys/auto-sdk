# Autonomys Auto Consensus SDK

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-consensus.svg)](https://badge.fury.io/js/@autonomys%2Fauto-consensus)

## Overview

The **Autonomys Auto Consensus SDK** (`@autonomys/auto-consensus`) offers a suite of functions for interacting with the **Autonomys Network's consensus layer**. It enables developers to:

- **Manage Accounts**: Retrieve account information and balances.
- **Handle Balances**: Check balances and total token issuance.
- **Perform Transfers**: Transfer tokens between accounts.
- **Stake and Nominate Operators**: Participate in staking operations.
- **Access Blockchain Information**: Fetch block numbers, hashes, and network timestamps.
- **Interact with Domains**: Retrieve domain-related data.

## Features

- **Account Management**: Access detailed account information, including nonce and balance data.
- **Balance Operations**: Retrieve account balances and the total issuance of tokens in the network.
- **Token Transfers**: Transfer tokens securely between addresses.
- **Staking Functionality**: Register operators, nominate operators, and manage staking operations.
- **Blockchain Information Access**: Fetch current block numbers, block hashes, and network timestamps.
- **Domain Interactions**: Access domain registry information and staking summaries.
- **TypeScript Support**: Fully typed for enhanced developer experience.

## Installation

Install the package via npm or yarn:

```bash
# Using npm
npm install @autonomys/auto-consensus

# Using yarn
yarn add @autonomys/auto-consensus
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
import {
  account,
  balance,
  totalIssuance,
  transfer,
  registerOperator,
  nominateOperator,
  blockNumber,
  blockHash,
  networkTimestamp,
  domains,
  domainStakingSummary,
  latestConfirmedDomainBlock,
} from '@autonomys/auto-consensus'
```

## Usage Examples

Below are examples demonstrating how to use the functions provided by `@autonomys/auto-consensus`.

### 1. Account Management

#### **Retrieve Account Information**

Get detailed account information, including the nonce and balance data.

```typescript
import { account } from '@autonomys/auto-consensus'
import { activate } from '@autonomys/auto-utils'
;(async () => {
  const api = await activate({ networkId: 'your_network_id' })
  const accountData = await account(api, 'your_address')

  console.log(`Nonce: ${accountData.nonce}`)
  console.log(`Free Balance: ${accountData.data.free}`)
  console.log(`Reserved Balance: ${accountData.data.reserved}`)

  await api.disconnect()
})()
```

**Parameters:**

- `api` (ApiPromise): Connected API instance.
- `address` (string): The account address.

**Returns:**

- An object containing:
  - `nonce`: The account's transaction nonce.
  - `data`: An object with balance details (`free`, `reserved`, `miscFrozen`, `feeFrozen`).

### 2. Balance Operations

#### **Retrieve Account Balance**

Get the free balance of an account.

```typescript
import { balance } from '@autonomys/auto-consensus'
import { activate } from '@autonomys/auto-utils'
;(async () => {
  const api = await activate({ networkId: 'your_network_id' })
  const accountBalance = await balance(api, 'your_address')

  console.log(`Free Balance: ${accountBalance.free}`)

  await api.disconnect()
})()
```

#### **Get Total Issuance**

Retrieve the total token issuance in the network.

```typescript
import { totalIssuance } from '@autonomys/auto-consensus'
;(async () => {
  const total = await totalIssuance('your_network_id')

  console.log(`Total Issuance: ${total.toString()}`)
})()
```

**Parameters:**

- `networkId` (string, optional): The network ID.

**Returns:**

- A Codec representing the total issuance value.

### 3. Transfers

#### **Transfer Tokens**

Transfer tokens from one account to another.

```typescript
import { transfer, events } from '@autonomys/auto-consensus'
import { activate, activateWallet, signAndSendTx, disconnect } from '@autonomys/auto-utils'
;(async () => {
  const api = await activate({ networkId: 'your_network_id' })
  const { accounts } = await activateWallet({
    networkId: 'your_network_id',
    mnemonic: 'your_mnemonic',
  })

  const sender = accounts[0]
  const recipientAddress = 'recipient_address'
  const amount = '1000000000000' // Amount in smallest units (e.g., wei)

  const tx = await transfer(api, recipientAddress, amount)

  // Sign and send the transaction
  await signAndSendTx(sender, tx, [events.transfer])

  console.log(`Transferred ${amount} tokens to ${recipientAddress}`)

  await disconnect(api)
})()
```

**Parameters:**

- `api` (ApiPromise): Connected API instance.
- `recipient` (string): Recipient's address.
- `amount` (number | string | BN): Amount to transfer.

**Returns:**

- A SubmittableExtrinsic transaction object.

### 4. Staking Operations

#### **Register an Operator**

Register a new operator for staking.

```typescript
import { registerOperator, events } from '@autonomys/auto-consensus'
import { activate, activateWallet, signAndSendTx } from '@autonomys/auto-utils'
;(async () => {
  const api = await activate({ networkId: 'your_network_id' })

  // Sender's account (who will register the operator)
  const { accounts: senderAccounts } = await activateWallet({
    networkId: 'your_network_id',
    mnemonic: 'sender_mnemonic',
  })
  const sender = senderAccounts[0]

  // Operator's account
  const { accounts: operatorAccounts } = await activateWallet({
    networkId: 'your_network_id',
    mnemonic: 'operator_mnemonic',
  })
  const operatorAccount = operatorAccounts[0]

  const tx = await registerOperator({
    api,
    senderAddress: sender.address,
    Operator: operatorAccount,
    domainId: '0', // Domain ID where the operator will be registered
    amountToStake: '1000000000000000000', // Amount in smallest units
    minimumNominatorStake: '10000000000000000',
    nominationTax: '5', // Percentage as a string (e.g., '5' for 5%)
  })

  // Sign and send the transaction
  await signAndSendTx(sender, tx, [events.operatorRegistered])

  console.log('Operator registered successfully')
})()
```

**Parameters:**

- `api` (ApiPromise): Connected API instance.
- `senderAddress` (string): Address of the sender registering the operator.
- `Operator` (KeyringPair): Key pair of the operator account.
- `domainId` (string): ID of the domain.
- `amountToStake` (string): Amount to stake in smallest units.
- `minimumNominatorStake` (string): Minimum stake required from nominators.
- `nominationTax` (string): Percentage tax for nominations.

**Returns:**

- A SubmittableExtrinsic transaction object.

#### **Nominate an Operator**

Nominate an existing operator by staking tokens.

```typescript
import { nominateOperator, events } from '@autonomys/auto-consensus'
import { activate, activateWallet, signAndSendTx } from '@autonomys/auto-utils'
;(async () => {
  const api = await activate({ networkId: 'your_network_id' })
  const { accounts } = await activateWallet({
    networkId: 'your_network_id',
    mnemonic: 'nominator_mnemonic',
  })
  const nominator = accounts[0]

  const operatorId = '1' // The ID of the operator to nominate
  const amountToStake = '5000000000000000000' // Amount in smallest units

  const tx = await nominateOperator({
    api,
    operatorId,
    amountToStake,
  })

  // Sign and send the transaction
  await signAndSendTx(nominator, tx, [events.operatorNominated])

  console.log(`Nominated operator ${operatorId} with ${amountToStake} stake`)
})()
```

**Parameters:**

- `api` (ApiPromise): Connected API instance.
- `operatorId` (string): ID of the operator to nominate.
- `amountToStake` (string): Amount to stake in smallest units.

**Returns:**

- A SubmittableExtrinsic transaction object.

### 5. Blockchain Information

#### **Get Block and Network Information**

Retrieve the current block number, block hash, and network timestamp.

```typescript
import { blockNumber, blockHash, networkTimestamp } from '@autonomys/auto-consensus'
;(async () => {
  const currentBlockNumber = await blockNumber()
  const currentBlockHash = await blockHash()
  const currentTimestamp = await networkTimestamp()

  console.log(`Current Block Number: ${currentBlockNumber}`)
  console.log(`Current Block Hash: ${currentBlockHash}`)
  console.log(`Network Timestamp: ${currentTimestamp}`)
})()
```

**Functions:**

- `blockNumber()`: Returns the current block number as a `BigInt`.
- `blockHash()`: Returns the current block hash as a hex string.
- `networkTimestamp()`: Returns the network timestamp as a `BigInt`.

### 6. Domain Interactions

#### **Retrieve Domains Information**

Get the list of domains registered on the network.

```typescript
import { domains } from '@autonomys/auto-consensus'
import { activate } from '@autonomys/auto-utils'
;(async () => {
  const api = await activate({ networkId: 'your_network_id' })
  const domainList = await domains(api)

  domainList.forEach((domain) => {
    console.log(`Domain ID: ${domain.id}`)
    console.log(`Owner Address: ${domain.owner}`)
    console.log(`Creation Block: ${domain.creationBlock}`)
    // ...other domain properties
  })

  await api.disconnect()
})()
```

#### **Get Domain Staking Summary**

Retrieve staking summaries for all domains.

```typescript
import { domainStakingSummary } from '@autonomys/auto-consensus'
import { activate } from '@autonomys/auto-utils'
;(async () => {
  const api = await activate({ networkId: 'your_network_id' })
  const stakingSummaries = await domainStakingSummary(api)

  stakingSummaries.forEach((summary) => {
    console.log(`Domain ID: ${summary.domainId}`)
    console.log(`Total Stake: ${summary.totalStake}`)
    // ...other summary properties
  })

  await api.disconnect()
})()
```

#### **Get Latest Confirmed Domain Blocks**

Fetch the latest confirmed blocks for each domain.

```typescript
import { latestConfirmedDomainBlock } from '@autonomys/auto-consensus'
import { activate } from '@autonomys/auto-utils'
;(async () => {
  const api = await activate({ networkId: 'your_network_id' })
  const confirmedBlocks = await latestConfirmedDomainBlock(api)

  confirmedBlocks.forEach((blockInfo) => {
    console.log(`Domain ID: ${blockInfo.id}`)
    console.log(`Block Number: ${blockInfo.number}`)
    console.log(`Block Hash: ${blockInfo.hash}`)
    // ...other block properties
  })

  await api.disconnect()
})()
```

## API Reference

### Account Functions

#### **`account(api: Api, address: string): Promise<AccountData>`**

Retrieve detailed account information.

- **Parameters:**
  - `api` (`Api`): Connected API instance.
  - `address` (`string`): The account address.
- **Returns:** `Promise<AccountData>` containing `nonce` and `data` with balance details.

#### **`balance(api: Api, address: string): Promise<BalanceData>`**

Get the balance data of an account.

- **Parameters:**
  - `api` (`Api`): Connected API instance.
  - `address` (`string`): The account address.
- **Returns:** `Promise<BalanceData>` with balance details.

### Balance Functions

#### **`totalIssuance(networkId?: string): Promise<Codec>`**

Retrieve the total token issuance in the network.

- **Parameters:**
  - `networkId` (`string`, optional): The network ID.
- **Returns:** `Promise<Codec>` representing the total issuance.

### Transfer Functions

#### **`transfer(api: ApiPromise, recipient: string, amount: BN | string | number): SubmittableExtrinsic`**

Create a transfer transaction.

- **Parameters:**
  - `api` (`ApiPromise`): Connected API instance.
  - `recipient` (`string`): Recipient's address.
  - `amount` (`BN | string | number`): Amount to transfer.
- **Returns:** `SubmittableExtrinsic` transaction object.

### Staking Functions

#### **`registerOperator(params: RegisterOperatorParams): Promise<SubmittableExtrinsic>`**

Register a new operator.

- **Parameters:**
  - `params` (`RegisterOperatorParams`): Parameters for operator registration.
- **Returns:** `Promise<SubmittableExtrinsic>`

#### **`nominateOperator(params: NominateOperatorParams): Promise<SubmittableExtrinsic>`**

Nominate an existing operator.

- **Parameters:**
  - `params` (`NominateOperatorParams`): Parameters for nominating an operator.
- **Returns:** `Promise<SubmittableExtrinsic>`

### Blockchain Information Functions

#### **`blockNumber(): Promise<bigint>`**

Get the current block number.

- **Returns:** `Promise<bigint>`

#### **`blockHash(): Promise<string>`**

Get the current block hash.

- **Returns:** `Promise<string>`

#### **`networkTimestamp(): Promise<bigint>`**

Get the network timestamp.

- **Returns:** `Promise<bigint>`

### Domain Functions

#### **`domains(api: Api): Promise<DomainRegistry[]>`**

Retrieve the list of domains.

- **Parameters:**
  - `api` (`Api`): Connected API instance.
- **Returns:** `Promise<DomainRegistry[]>`

#### **`domainStakingSummary(api: Api): Promise<DomainStakingSummary[]>`**

Get staking summaries for domains.

- **Parameters:**
  - `api` (`Api`): Connected API instance.
- **Returns:** `Promise<DomainStakingSummary[]>`

#### **`latestConfirmedDomainBlock(api: Api): Promise<ConfirmedDomainBlock[]>`**

Fetch the latest confirmed domain blocks.

- **Parameters:**
  - `api` (`Api`): Connected API instance.
- **Returns:** `Promise<ConfirmedDomainBlock[]>`

## Error Handling

When using `@autonomys/auto-consensus`, make sure to handle errors, especially when interacting with network operations.

**Example:**

```typescript
import { account } from '@autonomys/auto-consensus'
import { activate } from '@autonomys/auto-utils'
;(async () => {
  try {
    const api = await activate({ networkId: 'your_network_id' })
    const accountData = await account(api, 'your_address')

    // Use accountData...

    await api.disconnect()
  } catch (error) {
    console.error('Error occurred:', error)
  }
})()
```

## Contributing

We welcome contributions to `@autonomys/auto-consensus`! Please follow these guidelines:

1. **Fork the repository** on GitHub.

2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/your-username/auto-sdk.git
   cd auto-sdk/packages/auto-consensus
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

## License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.

## Additional Resources

- **Autonomys Academy**: Learn more at [Autonomys Academy](https://academy.autonomys.xyz).
- **Auto-Utils Package**: Utility functions used alongside `auto-consensus` can be found in [`@autonomys/auto-utils`](../Auto-Utils/README.md).

## Contact

If you have any questions or need support, feel free to reach out:

- **GitHub Issues**: [GitHub Issues Page](https://github.com/autonomys/auto-sdk/issues)

We appreciate your feedback and contributions!
