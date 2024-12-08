# Autonomys Auto Drive SDK

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-drive.svg)](https://badge.fury.io/js/@autonomys/auto-drive)

## Overview

The `auto-drive` package provides a set of tools to interact with the Autonomys Auto-Drive API. Below are some key functionalities:

### This package is an ES Module package and it's designed to work with ESM applications.

Check [this tutorial](https://dev.to/mangadev/set-up-a-backend-nodejs-typescript-jest-using-es-modules-1530) in how to setup a ES module application

### Installation

To install the package, use the following command:

```bash
yarn add @autonomys/auto-drive
```

### How to use it?

### How to upload a file from filepath? (Not available in browser)

Here is an example of how to use the `uploadFileFromFilepath` method to upload a file with optional encryption and compression:

```typescript
import { uploadFileFromFilepath } from '@autonomys/auto-drive'

const api = createAutoDriveApi({ apiKey: 'your-api-key' }) // Initialize your API instance with API key
const filePath = 'path/to/your/file.txt' // Specify the path to your file
const options = {
  password: 'your-encryption-password', // Optional: specify a password for encryption
  compression: true,
}

const uploadObservable = uploadFileFromFilepath(api, filePath, options)
  .then(() => {
    console.log('File uploaded successfully!')
  })
  .catch((error) => {
    console.error('Error uploading file:', error)
  })
```

### How to upload [File](https://developer.mozilla.org/en-US/docs/Web/API/File) interface

```typescript
import { uploadFileFromFilepath } from '@autonomys/auto-drive'

const api = createAutoDriveApi({ apiKey: 'your-api-key' }) // Initialize your API instance with API key
const filePath = 'path/to/your/file.txt' // Specify the path to your file
const options = {
  password: 'your-encryption-password', // Optional: specify a password for encryption
  compression: true,
}

const uploadObservable = uploadFile(api, filePath, options)
  .then(() => {
    console.log('File uploaded successfully!')
  })
  .catch((error) => {
    console.error('Error uploading file:', error)
  })
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
import { uploadFile } from '@autonomys/auto-drive'

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
}

const uploadObservable = uploadFile(api, genericFile, options)
  .then(() => {
    console.log('File uploaded successfully!')
  })
  .catch((error) => {
    console.error('Error uploading file:', error)
  })
```

### How to upload a folder from folder? (Not available in browser)

```ts
import { uploadFolderFromFolderPath } from '@autonomys/auto-drive'

const api = createAutoDriveApi({ apiKey: 'your-api-key' }) // Initialize your API instance with API key
const folderPath = 'path/to/your/folder' // Specify the path to your folder

const options = {
  uploadChunkSize: 1024 * 1024, // Optional: specify the chunk size for uploads
  password: 'your-encryption-password', // Optional: If folder is encrypted
}

const uploadObservable = uploadFolderFromFolderPath(api, folderPath, options)
```

**Note: If a folder is tried to be encrypted a zip file would be generated and that file would be encrypted and uploaded.**

### Handle observables

Since uploads may take some time, specially in big-sized files. Uploads do implement `rxjs` observables so you could have feedback about the process or even show your users the progress of the upload.

For that reason when file upload functions return `PromisedObservable<UploadFileStatus>`:

```typescript
export type UploadFileStatus = {
  type: 'file'
  progress: number
  cid?: CID
}
```

Being the cid only returned (and thus optional) when the upload is completed.

Similarly, for folder uploads the functions return `PromisedObservable<UploadFolderStatus>`

```ts
export type UploadFolderStatus = {
  type: 'folder'
  progress: number
  cid?: CID
}
```

**e.g Show upload progress in React**

```typescript
const [progress, setProgress] = useState<number>(0)

useEffect(async () => {
  const finalStatus = await uploadFileFromInput(api, genericFile, options).forEach((status) => {
    setProgress(status.progress)
  })
})
```

**e.g Ignore observables**

Other users may want to not use the progress observability. For having a promise instead the field `promise` is a Promise that resolves into `UploadFileStatus` and `UploadFolderStatus` for files and folders respectively.

e.g

```ts
const status = await uploadFileFromInput(api, genericFile, options).promise
const cid = status.cid
```

### Example Usage of Download

Here is an example of how to use the `downloadFile` method to download a file from the server:

```typescript
import { downloadObject } from '@autonomys/auto-drive'

const api = createAutoDriveApi({ apiKey: 'your-api-key' }) // Initialize your API instance with API key

try {
  const cid = '..'
  const stream = await downloadObject(api, { cid })
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
import { createAutoDriveApi, downloadObject } from '@autonomys/auto-drive'
import fs from 'fs'

const api = createAutoDriveApi({ apiKey: 'your-api-key' }) // Initialize your API instance with API key

try {
  const stream = fs.createWriteStream('/path/to/file')
  const asyncBuffer = await downloadObject(api, { cid })
  for await (const buffer of asyncBuffer) {
    stream.write(buffer)
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
