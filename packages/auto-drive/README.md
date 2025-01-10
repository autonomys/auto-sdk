# Autonomys Auto Drive SDK

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-drive.svg)](https://badge.fury.io/js/@autonomys/auto-drive)

## Overview

The `auto-drive` package provides a set of tools to interact with the Autonomys Auto-Drive API.

### Installation

To install the package, use the following command:

```bash
yarn add @autonomys/auto-drive
```

### How to use it?

### How to upload a file from filepath? (Not available in browser)

Here is an example of how to use the `uploadFileFromFilepath` method to upload a file with optional encryption and compression:

```typescript
import { uploadFileFromFilepath,createAutoDriveApi } from '@autonomys/auto-drive'

const api = createAutoDriveApi({ apiKey: 'your-api-key' }) // Initialize your API instance with API key
const filePath = 'path/to/your/file.txt' // Specify the path to your file
const options = {
  password: 'your-encryption-password', // Optional: specify a password for encryption
  compression: true,
  // an optional callback useful for large file uploads
  onProgress?: (progress: number) => {
    console.log(`The upload is completed is ${progress}% completed`)
  }
}

const cid = await uploadFileFromFilepath(api, filePath, options)

console.log(`The file is uploaded and its cid is ${cid}`)
```

### How to upload [File](https://developer.mozilla.org/en-US/docs/Web/API/File) interface

```typescript
import { uploadFileFromInput, createAutoDriveApi } from '@autonomys/auto-drive'

const api = createAutoDriveApi({ apiKey: 'your-api-key' }) // Initialize your API instance with API key

// e.g Get File from object from HTML event
const file: File = e.target.value // Substitute with your file
const options = {
  password: 'your-encryption-password', // Optional: specify a password for encryption
  compression: true,
}
const cid = await uploadFileFromInput(api, file, options)

console.log(`The file is uploaded and its cid is ${cid}`)
```

### How to upload a file from a custom interface?

Some times you might have a custom interface that doesn't fit either File or filepath. For those cases exists the interface GenericFile:

```typescript
export interface GenericFile {
  read(): AsyncIterable<Buffer> // A buffer generator function that will output the bytes of the file
  name: string
  mimeType?: string
  size: number
  path: string // Could be ignored in file upload
}
```

For more info about asynn generator visit [this website](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator).

You could upload any file that could be represented in that way. For example, uploading a file as a `Buffer`

```typescript
import { createAutoDriveApi, uploadFile } from '@autonomys/auto-drive'

const api = createAutoDriveApi({ apiKey: 'your-api-key' }) // Initialize your API instance with API key
const buffer = Buffer.from(...);
const genericFile = {
  read: async function *() {
    yield buffer
  },
  name: "autonomys-whitepaper.pdf",
  mimeType: "application/pdf",
  size: 1234556,
  path: "autonomys-whitepaper.pdf"
}

const options = {
  password: 'your-encryption-password', // Optional: specify a password for encryption
  compression: true,
  // an optional callback useful for large file uploads
  onProgress?: (progress: number) => {
    console.log(`The upload is completed is ${progress}% completed`)
  }
}

const cid = uploadFile(api, genericFile, options)

console.log(`The file is uploaded and its cid is ${cid}`)
```

### How to upload a folder from folder? (Not available in browser)

```ts
import { createAutoDriveApi, uploadFolderFromFolderPath } from '@autonomys/auto-drive'

const api = createAutoDriveApi({ apiKey: 'your-api-key' }) // Initialize your API instance with API key
const folderPath = 'path/to/your/folder' // Specify the path to your folder

const options = {
  uploadChunkSize: 1024 * 1024, // Optional: specify the chunk size for uploads
  password: 'your-encryption-password', // Optional: If folder is encrypted
  // an optional callback useful for large file uploads
  onProgress: (progress: number) => {
    console.log(`The upload is completed is ${progress}% completed`)
  },
}

const folderCID = await uploadFolderFromFolderPath(api, folderPath, options)

console.log(`The folder is uploaded and its cid is ${folderCID}`)
```

**Note: If a folder is tried to be encrypted a zip file would be generated and that file would be encrypted and uploaded.**

### Example Usage of Download

Here is an example of how to use the `downloadFile` method to download a file from the server:

```typescript
import { createAutoDriveApi, downloadFile } from '@autonomys/auto-drive'

const api = createAutoDriveApi({ apiKey: 'your-api-key' }) // Initialize your API instance with API key

try {
  const cid = '..'
  const stream = await downloadFile(api, cid)
  let file = Buffer.alloc(0)
  for await (const chunk of stream) {
    file = Buffer.concat([file, chunk])
  }
  console.log('File downloaded successfully:', stream)
} catch (error) {
  console.error('Error downloading file:', error)
}
```

### Example Usage of getRoots

Here is an example of how to use the `getRoots` method to retrieve the root directories:

```typescript
import { createAutoDriveApi, apiCalls, Scope } from '@autonomys/auto-drive'

const api = createAutoDriveApi({ apiKey: 'your-api-key' }) // Initialize your API instance with API key

try {
  const myFiles = await apiCalls.getRoots(api, {
    scope: Scope.User,
    limit: 100,
    offset: 0,
  })

  console.log(`Retrieved ${myFiles.rows.length} files of ${myFiles.totalCount} total`)
  for (const file of myFiles.rows) {
    console.log(`${file.name} - ${file.headCid}: ${file.size}`)
  }
} catch (error) {
  console.error('Error downloading file:', error)
}
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Additional Resources

- **Autonomys Academy**: Learn more at [Autonomys Academy](https://academy.autonomys.xyz).

## Contact

If you have any questions or need support, feel free to reach out:

- **GitHub Issues**: [GitHub Issues Page](https://github.com/autonomys/auto-sdk/issues)

We appreciate your feedback and contributions!
