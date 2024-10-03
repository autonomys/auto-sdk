# Auto-Drive

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-drive.svg)](https://badge.fury.io/js/@autonomys%2Fauto-drive)

## Overview

The **Autonomys Auto Drive SDK** (`@autonomys/auto-drive`) provides utilities for creating and managing IPLD DAGs (InterPlanetary Linked Data Directed Acyclic Graphs) for files and folders. It facilitates chunking large files, handling metadata, and creating folder structures suitable for distributed storage systems like IPFS.

## Features

- **File Chunking**: Efficiently split large files into smaller chunks.
- **Metadata Handling**: Add and manage metadata for files and folders.
- **Folder Structure Creation**: Generate IPLD DAGs for directory structures.
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

### Creating a DAG from a File

To create a DAG from a file, you can use the `createDAGFromFile` function:

```typescript
import { createDAGFromFile } from '@autonomys/auto-drive'

const dag = await createDAGFromFile('path/to/your/file.txt')
```

### Creating a DAG from a Folder

To create a DAG from a folder, you can use the `createDAGFromFolder` function:

```typescript
import { createDAGFromFolder } from '@autonomys/auto-drive'

const dag = await createDAGFromFolder('path/to/your/folder')
```

### Chunking a File

To chunk a file into smaller pieces, you can use the `chunkFile` function:

```typescript
import { chunkFile } from '@autonomys/auto-drive'

const chunks = await chunkFile('path/to/your/file.txt')
```

### Handling Metadata

To add metadata to a DAG, you can use the `addMetadata` function:

```typescript
import { addMetadata } from '@autonomys/auto-drive'

const dagWithMetadata = await addMetadata(dag, {
  name: 'My File',
  description: 'This is a sample file',
})
```

### Creating a Folder Structure

To create a folder structure, you can use the `createFolderStructure` function:

```typescript
import { createFolderStructure } from '@autonomys/auto-drive'

const folderStructure = await createFolderStructure('path/to/your/folder')
```

### Example: Creating a DAG from a File and Adding Metadata

```typescript
import { createDAGFromFile, addMetadata } from '@autonomys/auto-drive'

const dag = await createDAGFromFile('path/to/your/file.txt')
const dagWithMetadata = await addMetadata(dag, {
  name: 'My File',
  description: 'This is a sample file',
})
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
