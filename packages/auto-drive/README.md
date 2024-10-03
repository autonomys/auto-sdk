# Auto-Drive

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-drive.svg)](https://badge.fury.io/js/@autonomys/auto-drive)

## Overview

The **Autonomys Auto Drive SDK** (`@autonomys/auto-drive`) provides utilities for creating and managing IPLD DAGs (InterPlanetary Linked Data Directed Acyclic Graphs) for files and folders. It facilitates chunking large files, handling metadata, and creating folder structures suitable for distributed storage systems like IPFS.

## Features

- **File Chunking and DAG Creation**: Efficiently split large files into smaller chunks and create IPLD DAGs.
- **Folder Structure Creation**: Generate IPLD DAGs for directory structures.
- **Metadata Handling**: Add and manage metadata for files and folders.
- **CID Management**: Utilities for working with Content Identifiers (CIDs).
- **TypeScript Support**: Fully typed for enhanced developer experience.

## Installation

You can install Auto-Drive using npm or yarn:

```bash
npm install @autonomys/auto-drive
```

or

```bash
yarn add @autonomys/auto-drive
```

## Usage

### Creating an IPLD DAG from a File

To create an IPLD DAG from a file, you can use the `createFileIPLDDag` function:

```typescript
import { createFileIPLDDag } from '@autonomys/auto-drive'
import fs from 'fs'

const fileBuffer = fs.readFileSync('path/to/your/file.txt')

const dag = createFileIPLDDag(fileBuffer, 'file.txt')
```

### Creating an IPLD DAG from a Folder

To create an IPLD DAG from a folder, you can use the `createFolderIPLDDag` function:

```typescript
import { createFolderIPLDDag } from '@autonomys/auto-drive'
import { CID } from 'multiformats'

// Example child CIDs and folder information
const childCIDs: CID[] = [
  /* array of CIDs */
]
const folderName = 'my-folder'
const folderSize = 1024 // size in bytes

const folderDag = createFolderIPLDDag(childCIDs, folderName, folderSize)
```

### Working with CIDs

You can use functions from the `cid` module to work with CIDs:

```typescript
import { cidOfNode, cidToString, stringToCid } from '@autonomys/auto-drive'

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
import { encodeNode, decodeNode } from '@autonomys/auto-drive'

// Encode a node
const encodedNode = encodeNode(dag.head)

// Decode a node
const decodedNode = decodeNode(encodedNode)
```

### Handling Metadata

To add metadata to a node, you can create a metadata node:

```typescript
import { createMetadataNode } from '@autonomys/auto-drive'

const metadata = {
  name: 'My File',
  description: 'This is a sample file',
  // ... other metadata fields
}

const metadataNode = createMetadataNode(metadata)
```

### Example: Creating a File DAG and Converting to CID

```typescript
import { createFileIPLDDag, cidOfNode, cidToString } from '@autonomys/auto-drive'
import fs from 'fs'

const fileBuffer = fs.readFileSync('path/to/your/file.txt')

const dag = createFileIPLDDag(fileBuffer, 'file.txt')

const cid = cidOfNode(dag.headCID)
const cidString = cidToString(cid)

console.log(`CID of the file DAG: ${cidString}`)
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Additional Resources

- **Autonomys Academy**: Learn more at [Autonomys Academy](https://academy.autonomys.xyz).
- **Auto-Utils Package**: Utility functions used alongside `auto-drive` can be found in [`@autonomys/auto-utils`](../Auto-Utils/README.md).

## Contact

If you have any questions or need support, feel free to reach out:

- **GitHub Issues**: [GitHub Issues Page](https://github.com/autonomys/auto-sdk/issues)

We appreciate your feedback and contributions!
