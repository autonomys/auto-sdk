# Autonomys Auto Agents SDK

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-agents.svg)](https://badge.fury.io/js/@autonomys/auto-agents)

## Overview

The `@autonomys/auto-agents` package provides utilities for managing the state or "experiences" of autonomous agents built on the Autonomys Network. It facilitates saving agent state to AutoDrive and tracking the latest state via an on-chain reference (using EVM).

## Key Features

- **Save Agent Experiences:** Persist agent state (arbitrary data) along with metadata (agent name, version, timestamp, previous state CID) to AutoDrive.
- **Retrieve Agent Experiences:** Download agent state from AutoDrive using its Content Identifier (CID).
- **On-Chain State Tracking:** Store and update the CID of the latest agent experience on an EVM-compatible chain.
- **Local Caching:** Maintain a local cache of the latest known experience CID for faster lookups and offline support.
- **Resilience:** Includes retry logic for network operations.

## Installation

```bash
yarn add @autonomys/auto-agents
# or
npm install @autonomys/auto-agents
```

## How to Use

The primary entry point is the `createExperienceManager` function.

### Setup Options

You need to provide configuration options:

```typescript
import type { ExperienceManagerOptions } from '@autonomys/auto-agents'

const options: ExperienceManagerOptions = {
  // AutoDrive API configuration
  autoDriveApiOptions: {
    apiKey: 'YOUR_AUTO_DRIVE_API_KEY', // Get from https://ai3.storage
    network: 'taurus', // or 'mainnet'
  },
  // Options for uploading experiences (compression, encryption)
  uploadOptions: {
    compression: true,
    // password: 'OPTIONAL_ENCRYPTION_PASSWORD'
  },
  // EVM wallet and contract details for on-chain CID tracking
  walletOptions: {
    privateKey: 'YOUR_AGENT_EVM_PRIVATE_KEY',
    rpcUrl: 'YOUR_EVM_RPC_URL', // e.g., Polygon Amoy RPC
    contractAddress: 'YOUR_AUTONOMYS_MEMORY_CONTRACT_ADDRESS', // Address of the deployed Memory contract
  },
  // Agent identification and local storage path
  agentOptions: {
    agentName: 'MyCoolAgent',
    agentPath: '/path/to/agent/storage', // Directory to store local cache (e.g., './agent-data')
    agentVersion: '1.0.0',
  },
}
```

### Creating the Manager

```typescript
import { createExperienceManager } from '@autonomys/auto-agents'

const initializeManager = async () => {
  try {
    const experienceManager = await createExperienceManager(options)
    console.log('Experience Manager created!')
    // Use the manager...
  } catch (error) {
    console.error('Failed to initialize Experience Manager:', error)
  }
}

initializeManager()
```

### Saving an Experience

```typescript
// Assuming 'experienceManager' is initialized as above

const currentAgentState = {
  memory: ['thought 1', 'thought 2'],
  lastAction: 'calculated optimal route',
}

const saveState = async () => {
  try {
    const result = await experienceManager.saveExperience(currentAgentState)
    console.log('Experience saved successfully!')
    console.log('New CID:', result.cid)
    console.log('Previous CID:', result.previousCid)
    console.log('EVM Tx Hash:', result.evmHash)
  } catch (error) {
    console.error('Failed to save experience:', error)
  }
}

saveState()
```

### Retrieving an Experience

You can retrieve the latest experience by first getting its CID from the `CidManager` provided by the `ExperienceManager`.

```typescript
// Assuming 'experienceManager' is initialized

const retrieveLatestState = async () => {
  try {
    // Get the CID of the latest saved experience
    const latestCid = await experienceManager.cidManager.getLastMemoryCid()

    if (!latestCid) {
      console.log('No previous experience found for this agent.')
      return
    }

    console.log(`Retrieving experience with CID: ${latestCid}`)
    const experience = await experienceManager.retrieveExperience(latestCid)

    console.log('Experience retrieved successfully:')
    console.log('Header:', experience.header)
    console.log('Data:', experience.data)
    // TODO: Verify signature: experience.signature
  } catch (error) {
    console.error('Failed to retrieve experience:', error)
  }
}

retrieveLatestState()
```

You can also retrieve any specific experience if you know its CID.

## CidManager

The `experienceManager` exposes the underlying `cidManager` instance. This allows more direct interaction with the latest experience CID management, such as checking the status of the local hash cache (`cidManager.localHashStatus`).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Additional Resources

- **Autonomys Academy**: Learn more at [Autonomys Academy](https://academy.autonomys.xyz).

## Contact

If you have any questions or need support, feel free to reach out:

- **GitHub Issues**: [GitHub Issues Page](https://github.com/autonomys/auto-sdk/issues)

We appreciate your feedback and contributions!
