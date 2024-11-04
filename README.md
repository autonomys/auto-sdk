# Autonomys Auto SDK Monorepo

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)

## Overview

The **Autonomys Auto SDK** is a powerful toolkit designed to empower developers to seamlessly integrate with the Autonomys Network. It enables interaction through familiar programming languages like TypeScript, without needing to delve into the complexities of blockchain or smart contracts. The SDK provides simple APIs for issuing and verifying Auto IDs, interacting with the consensus layer, handling data uploads, and managing payments using Auto Coin.

## Packages

This monorepo contains multiple packages, each serving a specific purpose. All packages are published to npm under the `@autonomys` scope:

- **[`@autonomys/auto-utils`](https://www.npmjs.com/package/@autonomys/auto-utils)**: Core utility functions for interacting with the Autonomys Network.
- **[`@autonomys/auto-consensus`](https://www.npmjs.com/package/@autonomys/auto-consensus)**: Functions for interacting with the Consensus Layer.
- **[`@autonomys/auto-dag-data`](https://www.npmjs.com/package/@autonomys/auto-dag-data)**: Tools for preparing and managing data for on-chain storage.
- **[`@autonomys/auto-id`](https://www.npmjs.com/package/@autonomys/auto-id)**: Functions for generating, renewing, and revoking Decentralized Identities (Auto IDs).

## Installation

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

### 2. Using `@autonomys/auto-dag-data`

The `@autonomys/auto-dag-data` package provides utilities for creating and managing IPLD DAGs (InterPlanetary Linked Data Directed Acyclic Graphs) for files and folders.

#### **Creating an IPLD DAG from a File**

```typescript
// Import necessary functions
import { createFileIPLDDag } from '@autonomys/auto-dag-data'
import fs from 'fs'

const fileBuffer = fs.readFileSync('path/to/your/file.txt')

// Create an IPLD DAG from the file data
const dag = createFileIPLDDag(fileBuffer, 'file.txt')

console.log(`Created DAG with head CID: ${dag.headCID}`)

// The 'nodes' map contains all nodes in the DAG
console.log(`Total nodes in DAG: ${dag.nodes.size}`)
```

#### **Creating an IPLD DAG from a Folder**

```typescript
// Import necessary functions
import { createFolderIPLDDag } from '@autonomys/auto-dag-data'
import { CID } from 'multiformats'
import fs from 'fs'
import path from 'path'

// Function to read files from a directory and create CIDs
function getFilesCIDs(directoryPath: string): CID[] {
  const fileNames = fs.readdirSync(directoryPath)
  const cids: CID[] = []

  fileNames.forEach((fileName) => {
    const filePath = path.join(directoryPath, fileName)
    const fileBuffer = fs.readFileSync(filePath)
    const fileDag = createFileIPLDDag(fileBuffer, fileName)
    cids.push(fileDag.headCID)
  })

  return cids
}

const directoryPath = 'path/to/your/folder'
const childCIDs = getFilesCIDs(directoryPath)
const folderName = 'my-folder'
const folderSize = childCIDs.length

// Create an IPLD DAG for the folder
const folderDag = createFolderIPLDDag(childCIDs, folderName, folderSize)

console.log(`Created folder DAG with head CID: ${folderDag.headCID}`)
```

### 3. Using `@autonomys/auto-id`

The `@autonomys/auto-id` package provides functionalities for managing certificates, authenticating users, and integrating Zero-Knowledge Proofs (ZKPs) on the Autonomys Network.

#### **Authenticate a User with Auto ID**

```typescript
// Import necessary functions
import { authenticateAutoIdUser } from '@autonomys/auto-id'
import { activate } from '@autonomys/auto-utils'

;(async () => {
  // Activate the network API
  const api = await activate()

  // User's Auto ID
  const autoId = 'user-auto-id' // Replace with the user's Auto ID

  // Challenge message that the user needs to sign
  const challengeMessage = 'Please sign this message to authenticate.'
  const challenge = new TextEncoder().encode(challengeMessage)

  // Assume the user provides the signature
  const signature = new Uint8Array([...]) // User's signature as Uint8Array

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

#### **Self-Issuing a Certificate**

```typescript
// Import necessary functions
import { selfIssueCertificate } from '@autonomys/auto-id'
import { generateKeyPair } from '@autonomys/auto-utils'
;(async () => {
  // Generate a key pair
  const keyPair = await generateKeyPair()

  // Subject name for the certificate
  const subjectName = 'CN=User Name' // Replace with appropriate subject

  // Generate a self-signed certificate
  const certificate = await selfIssueCertificate(subjectName, keyPair)

  console.log('Certificate created:', certificate)
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

## Contact

If you have any questions or need support, feel free to reach out:

- **GitHub Issues**: [GitHub Issues Page](https://github.com/autonomys/auto-sdk/issues)

We appreciate your feedback and contributions!
