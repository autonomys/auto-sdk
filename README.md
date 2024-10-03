# Autonomys Auto SDK Monorepo

The **Autonomys Auto SDK** is a powerful toolkit designed to empower developers to seamlessly integrate with the Autonomys Network. It enables interaction through familiar programming languages like TypeScript, without needing to delve into the complexities of blockchain or smart contracts. The SDK provides simple APIs for issuing and verifying Auto IDs, interacting with the consensus layer, handling data uploads, and managing payments using Auto Coin.

## Overview

The goal of the Auto SDK is to drive adoption by making it effortless for developers to build applications within the Auto ecosystem. By focusing on simplicity and transparency, the SDK ensures that user interactions with Auto ID, the consensus layer, and data management are seamless, removing barriers and ambiguity.

## Packages

This monorepo contains multiple packages, each serving a specific purpose. All packages are published to npm under the `@autonomys` scope:

- **[`@autonomys/auto-utils`](https://www.npmjs.com/package/@autonomys/auto-utils)**: Core utility functions for interacting with the Autonomys Network.
- **[`@autonomys/auto-consensus`](https://www.npmjs.com/package/@autonomys/auto-consensus)**: Functions for interacting with the Consensus Layer.
- **[`@autonomys/auto-drive`](https://www.npmjs.com/package/@autonomys/auto-drive)**: Tools for preparing and managing data for on-chain storage.
- **[`@autonomys/auto-id`](https://www.npmjs.com/package/@autonomys/auto-id)**: Functions for generating, renewing, and revoking Decentralized Identities (Auto IDs).

## Getting Started

### Requirements

- **Node.js** (version 14 or higher)
- **Yarn** or **npm**

### Installation

Install the packages you need via npm or yarn. For example, to install `@autonomys/auto-utils` and `@autonomys/auto-consensus`:

```bash
# Using npm
npm install @autonomys/auto-utils @autonomys/auto-consensus

# Using yarn
yarn add @autonomys/auto-utils @autonomys/auto-consensus
```

## Usage Examples

Below are small, reproducible examples demonstrating how to use each package. Packages are grouped where it makes sense to show how they interact.

### 1. Using `@autonomys/auto-utils` and `@autonomys/auto-consensus`

These two packages work hand-in-hand to allow you to interact with the Autonomys Network and perform actions like checking balances and transferring funds.

#### **Activate a Wallet and Check Balance**

```typescript
// Import necessary functions
import { activateWallet } from '@autonomys/auto-utils'
import { balance } from '@autonomys/auto-consensus'
;(async () => {
  // Activate a wallet using a mnemonic phrase
  const { api, accounts } = await activateWallet({
    mnemonic: 'your mnemonic phrase here', // Replace with your mnemonic
    networkId: 'gemini-3h', // Optional: specify the network ID
  })

  const account = accounts[0]
  console.log(`Connected with account address: ${account.address}`)

  // Check the account balance
  const accountBalance = await balance(api, account.address)
  console.log(`Account balance: ${accountBalance.free}`)

  // Disconnect when done
  await api.disconnect()
})()
```

#### **Transfer Funds Between Accounts**

```typescript
// Import necessary functions
import { activateWallet } from '@autonomys/auto-utils'
import { transfer } from '@autonomys/auto-consensus'
;(async () => {
  // Activate sender's wallet
  const senderWallet = await activateWallet({
    mnemonic: 'sender mnemonic phrase', // Replace with sender's mnemonic
  })
  const sender = senderWallet.accounts[0]

  // Activate receiver's wallet
  const receiverWallet = await activateWallet({
    mnemonic: 'receiver mnemonic phrase', // Replace with receiver's mnemonic
  })
  const receiver = receiverWallet.accounts[0]

  // Transfer 1 ATC from sender to receiver
  const amount = 1 // Amount in ATC
  const transferTx = await transfer(senderWallet.api, receiver.address, amount)

  // Sign and send the transaction
  await transferTx.signAndSend(sender, ({ status, txHash, events }) => {
    if (status.isInBlock) {
      console.log(`Transaction included at blockHash ${status.asInBlock}`)
      console.log(`Transaction hash: ${txHash}`)
    } else if (status.isFinalized) {
      console.log(`Transaction finalized at blockHash ${status.asFinalized}`)
    }
  })

  // Disconnect when done
  await senderWallet.api.disconnect()
  await receiverWallet.api.disconnect()
})()
```

### 2. Using `@autonomys/auto-drive`

The `@autonomys/auto-drive` package provides tools to prepare and manage data for on-chain storage.

#### **Prepare and Upload Data to the Autonomys Network**

```typescript
// Import necessary functions
import { activate } from '@autonomys/auto-utils'
import { prepareDataForUpload, uploadData } from '@autonomys/auto-drive'
;(async () => {
  // Activate the network API
  const api = await activate({
    networkId: 'gemini-3h', // Optional: specify the network ID
  })

  // Data you want to upload
  const data = Buffer.from('Example data to store on-chain')

  // Prepare data for upload
  const preparedData = prepareDataForUpload(data)

  // Upload data to the blockchain
  const txHash = await uploadData(api, preparedData)

  console.log(`Data uploaded with transaction hash: ${txHash}`)

  // Disconnect when done
  await api.disconnect()
})()
```

#### **Create and Store IPLD DAG**

```typescript
// Import necessary functions
import { createFileIPLDDag } from '@autonomys/auto-drive'
import { cidToString } from '@autonomys/auto-drive'

const data = Buffer.from('File content goes here')
const filename = 'example.txt'

// Create IPLD DAG from file data
const ipldDag = createFileIPLDDag(data, filename)

// Get the CID (Content Identifier) of the file
const fileCID = cidToString(ipldDag.headCID)
console.log(`File CID: ${fileCID}`)

// The 'nodes' map contains all nodes in the DAG
console.log(`Total nodes in DAG: ${ipldDag.nodes.size}`)
```

### 3. Using `@autonomys/auto-id`

The `@autonomys/auto-id` package allows you to manage Decentralized Identities (Auto IDs).

#### **Generate a New Auto ID**

```typescript
// Import necessary functions
import { generateAutoID } from '@autonomys/auto-id'
import { activateWallet } from '@autonomys/auto-utils'
;(async () => {
  // Activate a wallet
  const { api, accounts } = await activateWallet({
    mnemonic: 'your mnemonic phrase here', // Replace with your mnemonic
  })
  const account = accounts[0]

  // Generate a new Auto ID
  const autoID = await generateAutoID(api, account)
  console.log(`Generated Auto ID: ${autoID}`)

  // Disconnect when done
  await api.disconnect()
})()
```

#### **Authenticate Using Auto ID**

```typescript
// Import necessary functions
import { authenticateAutoIdUser } from '@autonomys/auto-id'
import { activate } from '@autonomys/auto-utils'

const challengeMessage = 'challenge message'
const challenge = new TextEncoder().encode(challengeMessage)
// Assume the user provides the signature and their Auto ID
const signature = new Uint8Array([...]) // User's signature as Uint8Array
const autoId = 'user-auto-id' // The user's Auto ID

;(async () => {
  // Activate the network API
  const api = await activate()

  // Authenticate the user
  const isAuthenticated = await authenticateAutoIdUser(api, autoId, challenge, signature)

  if (isAuthenticated) {
    console.log('User authenticated successfully.')
  } else {
    console.log('Authentication failed.')
  }

  // Disconnect when done
  await api.disconnect()
})()
```

## Local Development and Testing

If you wish to contribute or work on the SDK locally, follow the steps below to set up your development environment.

### Prerequisites

- **Node.js** (version 14 or higher)
- **Yarn** (version 1.22 or higher)
- **Git**

### Setting Up the Development Environment

1. **Clone the repository:**

   ```bash
   git clone https://github.com/autonomys/auto-sdk.git
   ```

2. **Navigate to the project directory:**

   ```bash
   cd auto-sdk
   ```

3. **Install Yarn 4 (Berry):**

   The project uses Yarn 4 for monorepo management.

   ```bash
   yarn set version berry
   ```

4. **Install dependencies:**

   ```bash
   yarn install
   ```

5. **Build all packages:**

   ```bash
   yarn build
   ```

6. **Run tests for all packages:**

   ```bash
   yarn test
   ```

### Running Tests for a Specific Package

To run tests for a specific package, navigate to the package directory and run the tests. For example, to run tests for `auto-utils`:

```bash
cd packages/auto-utils
yarn test
```

### Developing with Local Packages

During development, you might want to test changes across packages. To do this, you can use [Yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/) which are already set up in this monorepo. Changes in one package will be reflected in dependencies within the monorepo.

### Linting and Formatting

Ensure your code adheres to the project's linting and formatting standards:

```bash
# Check for linting errors
yarn lint

# Automatically fix linting errors
yarn lint:fix

# Format code with Prettier
yarn format
```

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for commit messages:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semi-colons, etc.)
- `refactor`: Code changes that neither fix a bug nor add a feature
- `test`: Adding or updating tests
- `chore`: Changes to the build process or auxiliary tools

Example commit message:

```
feat(auto-utils): add new function to handle network connections
```

## Contributing

We welcome community contributions! Here's how you can help:

### How to Contribute

1. **Fork the repository** on GitHub.

2. **Clone your forked repository** locally:

   ```bash
   git clone https://github.com/your-username/auto-sdk.git
   cd auto-sdk
   ```

3. **Create a new branch** for your feature or bug fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes** in the codebase.

5. **Commit your changes** following our commit message guidelines.

6. **Push your changes** to your forked repository:

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** against the `main` branch of the original repository.

### Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

### Reporting Issues

If you encounter any problems or have suggestions, please [open an issue](https://github.com/autonomys/auto-sdk/issues). Provide as much detail as possible to help us understand and address the issue.

### Getting Help

If you need assistance, feel free to reach out by opening an issue or joining our community discussions.

## Additional Resources

- **Autonomys Academy**: Learn more about the Auto SDK and the vision behind it at [Autonomys Academy](https://academy.autonomys.xyz/autonomys-solutions/autokit).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
