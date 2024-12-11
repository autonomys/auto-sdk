# Autonomys Auto DAG Data SDK

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-dag-data.svg)](https://badge.fury.io/js/@autonomys/auto-dag-data)

## Overview

The **Autonomys Auto Dag Data SDK** (`@autonomys/auto-dag-data`) provides utilities for creating and managing IPLD DAGs (InterPlanetary Linked Data Directed Acyclic Graphs) for files and folders. It facilitates chunking large files, handling metadata, and creating folder structures suitable for distributed storage systems like IPFS.

### This package is an ES Module package and it's designed to work with ESM applications.

Check [this tutorial](https://dev.to/mangadev/set-up-a-backend-nodejs-typescript-jest-using-es-modules-1530) in how to setup a ES module application.

## Features

- **File Chunking and DAG Creation**: Efficiently split large files into smaller chunks and create IPLD DAGs.
- **Folder Structure Creation**: Generate IPLD DAGs for directory structures.
- **Metadata Handling**: Add and manage metadata for files and folders.
- **CID Management**: Utilities for working with Content Identifiers (CIDs).
- **TypeScript Support**: Fully typed for enhanced developer experience.

## Installation

You can install Auto-Dag-Data using npm or yarn:

```bash
npm install @autonomys/auto-dag-data
```

or

```bash
yarn add @autonomys/auto-dag-data
```

## Usage

### Creating an IPLD DAG from a File

To create an IPLD DAG from a file, you can use the `processFileToIPLDFormat` function:

```typescript
import { processFileToIPLDFormat } from '@autonomys/auto-dag-data'
import { MemoryBlockstore } from 'blockstore-core/memory'
import fs from 'fs'

const fileStream = fs.createReadStream('path/to/your/file.txt')
const fileSize = fs.statSync('path/to/your/file.txt').size

const blockstore = new MemoryBlockstore()
const fileCID = processFileToIPLDFormat(blockstore, fileStream, totalSize, 'file.txt')
```

### Creating an IPLD DAG from a Folder

To generate an IPLD DAG from a folder, you can use the `processFolderToIPLDFormat` function:

```typescript
import { processFolderToIPLDFormat, decodeNode } from '@autonomys/auto-dag-data'
import { MemoryBlockstore } from 'blockstore-core/memory'
import { CID } from 'multiformats'

// Example child CIDs and folder information
const childCIDs: CID[] = [
  /* array of CIDs */
]
const folderName = 'my-folder'
const folderSize = 1024 // size in bytes (the sum of their children size)

const blockstore = new MemoryBlockstore()
const folderCID = processFolderToIPLDFormat(blockstore, childCIDs, folderName, folderSize)

const node = decodeNode(blockstore.get(folderCID))
```

### Working with CIDs

You can use functions from the `cid` module to work with CIDs:

```typescript
import { cidOfNode, cidToString, stringToCid } from '@autonomys/auto-dag-data'

// Create a CID from a node
const cid = cidOfNode(dag.head)

// Convert the CID to a string
const cidString = cidToString(cid)

// Parse a string back into a CID
const parsedCID = stringToCid(cidString)
```

### Encoding and Decoding Nodes

You can encode and decode IPLD nodes:

```typescript
import { encodeNode, decodeNode } from '@autonomys/auto-dag-data'

// Encode a node
const encodedNode = encodeNode(dag.head)

// Decode a node
const decodedNode = decodeNode(encodedNode)
```

### Handling Metadata

To add metadata to a node, you can create a metadata node:

```typescript
import { createMetadataNode } from '@autonomys/auto-dag-data'

const metadata = {
  name: 'My File',
  description: 'This is a sample file',
  // ... other metadata fields
}

const metadataNode = createMetadataNode(metadata)
```

### Example: Creating a File DAG and Converting to CID

```typescript
import { processFileToIPLDFormat } from '@autonomys/auto-dag-data'
import { MemoryBlockstore } from 'blockstore-core/memory'
import fs from 'fs'

const fileStream = fs.createReadStream('path/to/your/file.txt')
const fileSize = fs.statSync('path/to/your/file.txt').size

const blockstore = new MemoryBlockstore()
const cid = processFileToIPLDFormat(blockstore, fileStream, totalSize, 'file.txt')

const cidString = cidToString(cid)

console.log(`CID of the file DAG: ${cidString}`)
```

### Example: Converting Metadata To DAG

```typescript
import {
  createMetadataIPLDDag,
  cidOfNode,
  cidToString,
  type OffchainMetadata,
} from '@autonomys/auto-dag-data'
import { MemoryBlockstore } from 'blockstore-core/memory'
import fs from 'fs'

const metadata: OffchainMetadata = fs.readFileSync('path/to/your/metadata.json')

const blockstore = new MemoryBlockstore()
const cid = processMetadataToIPLDFormat(blockstore, metadata)

const cidString = cidToString(cid)

console.log(`CID of the metadata DAG: ${cidString}`)
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Additional Resources

- **Autonomys Academy**: Learn more at [Autonomys Academy](https://academy.autonomys.xyz).
- **Auto-Utils Package**: Utility functions used alongside `auto-dag-data` can be found in [`@autonomys/auto-utils`](../Auto-Utils/README.md).

## Contact

If you have any questions or need support, feel free to reach out:

- **GitHub Issues**: [GitHub Issues Page](https://github.com/autonomys/auto-sdk/issues)

We appreciate your feedback and contributions!
