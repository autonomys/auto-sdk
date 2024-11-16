# Autonomys Auto Drive SDK

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-drive.svg)](https://badge.fury.io/js/@autonomys/auto-drive)

## Overview

The `auto-drive` package provides a set of tools to interact with the Autonomys Auto-Drive API. Below are some key functionalities:

### Installation

To install the package, use the following command:

```bash
yarn add @autonomys/auto-drive
```

### How to use it?

### Example Usage

Here is an example of how to use the `uploadFile` method to upload a file with optional encryption and compression:

```typescript
import { uploadFile } from '@autonomys/auto-drive'

const api = new AutoDriveApi() // Initialize your API instance
const filePath = 'path/to/your/file.txt' // Specify the path to your file
const options = {
  password: 'your-encryption-password', // Optional: specify a password for encryption
  compression: true,
}

uploadFile(api, filePath, options)
  .then(() => {
    console.log('File uploaded successfully!')
  })
  .catch((error) => {
    console.error('Error uploading file:', error)
  })
```

### Example Usage of Download

Here is an example of how to use the `downloadFile` method to download a file from the server:

```typescript
import { getRoots } from '@autonomys/auto-drive'

const api = new AutoDriveApi() // Initialize your API instance

getRoots(api)
  .then((roots) => {
    console.log('Root directories:', roots)
  })
  .catch((error) => {
    console.error('Error retrieving root directories:', error)
  })
```

### Example Usage of getRoots

Here is an example of how to use the `getRoots` method to retrieve the root directories:

```typescript
import { getRoots } from '@autonomys/auto-drive'

const api = new AutoDriveApi() // Initialize your API instance

getRoots(api)
  .then((roots) => {
    console.log('Root directories:', roots)
  })
  .catch((error) => {
    console.error('Error retrieving root directories:', error)
  })
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Additional Resources

- **Autonomys Academy**: Learn more at [Autonomys Academy](https://academy.autonomys.xyz).

## Contact

If you have any questions or need support, feel free to reach out:

- **GitHub Issues**: [GitHub Issues Page](https://github.com/autonomys/auto-sdk/issues)

We appreciate your feedback and contributions!
