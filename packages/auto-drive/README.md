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

To interact with the Auto-Drive API, you'll need to create an API key. Follow these steps:

- Go to [Auto-Drive](https://ai3.storage) and login with your preffered SSO.
- Once you're logged in, click on the developers section in the left sidebar menu.
- In the developers section, click on 'Create API Key'
- Read the modal message and click on generate
Add
### How to upload a file from Buffer?

Here is an example of how to use the `uploadFileFromBuffer` method to upload a Buffer with optional encryption and compression:

```typescript
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET }) // Initialize your API instance with API key

// Create a buffer from your data
const buffer = Buffer.from('Hello, Autonomys!')
const fileName = 'hello.txt'

const options = {
  password: 'your-encryption-password', // Optional: specify a password for encryption
  compression: true,
  // an optional callback useful for large file uploads
  onProgress?: (progress: number) => {
    console.log(`The upload is ${progress}% completed`)
  }
}

const cid = await api.uploadFileFromBuffer(buffer, fileName, options)

console.log(`The file is uploaded and its cid is ${cid}`)
```

### How to upload a file from filepath? (Not available in browser)

Here is an example of how to use the `fs.uploadFileFromFilepath` method to upload a file with optional encryption and compression:

```typescript
import { fs, createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET }) // Initialize your API instance with API key
const filePath = 'path/to/your/file.txt' // Specify the path to your file
const options = {
  password: 'your-encryption-password', // Optional: specify a password for encryption
  compression: true,
  // an optional callback useful for large file uploads
  onProgress?: (progress: number) => {
    console.log(`The upload is completed is ${progress}% completed`)
  }
}

const cid = await fs.uploadFileFromFilepath(api, filePath, options)

console.log(`The file is uploaded and its cid is ${cid}`)
```

### How to upload [File](https://developer.mozilla.org/en-US/docs/Web/API/File) interface

```typescript
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET }) // Initialize your API instance with API key

// e.g Get File from object from HTML event
const file: File = e.target.value // Substitute with your file
const options = {
  password: 'your-encryption-password', // Optional: specify a password for encryption
  compression: true,
}
const cid = await api.uploadFileFromInput(file, options)

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
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET }) // Initialize your API instance with API key
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

const cid = api.uploadFile(genericFile, options)

console.log(`The file is uploaded and its cid is ${cid}`)
```

### How to upload a folder from folder? (Not available in browser)

```ts
import { createAutoDriveApi, fs } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET }) // Initialize your API instance with API key
const folderPath = 'path/to/your/folder' // Specify the path to your folder

const options = {
  uploadChunkSize: 1024 * 1024, // Optional: specify the chunk size for uploads
  password: 'your-encryption-password', // Optional: If folder is encrypted
  // an optional callback useful for large file uploads
  onProgress: (progress: number) => {
    console.log(`The upload is completed is ${progress}% completed`)
  },
}

const folderCID = await fs.uploadFolderFromFolderPath(api, folderPath, options)

console.log(`The folder is uploaded and its cid is ${folderCID}`)
```

**Note: If a folder is tried to be encrypted a zip file would be generated and that file would be encrypted and uploaded.**

### Example Usage of Download

Here is an example of how to use the `downloadFile` method to download a file from the server:

```typescript
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET }) // Initialize your API instance with API key

try {
  const cid = '..'
  const stream = await api.downloadFile(cid)
  let file = Buffer.alloc(0)
  for await (const chunk of stream) {
    file = Buffer.concat([file, chunk])
  }
  console.log('File downloaded successfully:', stream)
} catch (error) {
  console.error('Error downloading file:', error)
}
```

### Example Usage of Object Moderation

Here are examples of how to use the object moderation methods:

#### Report an Object

```typescript
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET })

try {
  const cid = 'your-object-cid'
  await api.reportObject(cid)
  console.log('Object reported successfully')
} catch (error) {
  console.error('Error reporting object:', error)
}
```

#### Ban an Object

```typescript
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET })

try {
  const cid = 'your-object-cid'
  await api.banObject(cid)
  console.log('Object banned successfully')
} catch (error) {
  console.error('Error banning object:', error)
}
```

#### Dismiss a Report

```typescript
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET })

try {
  const cid = 'your-object-cid'
  await api.dismissReport(cid)
  console.log('Report dismissed successfully')
} catch (error) {
  console.error('Error dismissing report:', error)
}
```

#### Get Objects to be Reviewed

```typescript
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET })

try {
  const toBeReviewed = await api.getToBeReviewedList(50, 0)
  console.log(`Found ${toBeReviewed.length} objects to be reviewed`)
  for (const object of toBeReviewed) {
    console.log(`${object.name} - ${object.headCid}: ${object.size}`)
  }
} catch (error) {
  console.error('Error getting objects to be reviewed:', error)
}
```

### Create shareable download link

Here is an example of how to use the `publishObject` method to publish an object and get its public download URL:

```typescript
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET }) // Initialize your API instance with API key

try {
  const cid = 'your-file-cid'
  const publicUrl = await api.publishObject(cid)
  console.log('Public download URL:', publicUrl)
} catch (error) {
  console.error('Error publishing object:', error)
}
```

**Note: For retrieving the link of an already published object just call again `publishObject` method**

### Example Usage of getMyFiles

Here is an example of how to use the `getMyFiles` method to retrieve the root directories:

```typescript
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

const api = createAutoDriveApi({ apiKey: 'your-api-key', network: NetworkId.MAINNET }) // Initialize your API instance with API key

try {
  for (let i = 0; i < 10; i++) {
    const myFiles = await api.getMyFiles(i, 100)
    console.log(`Retrieved ${myFiles.rows.length} files of ${myFiles.totalCount} total`)
    for (const file of myFiles.rows) {
      console.log(`${file.name} - ${file.headCid}: ${file.size}`)
    }
  }
} catch (error) {
  console.error('Error downloading file:', error)
}
```

### Pay with AI3 — purchasing storage credits

Storage on the Autonomys Network is paid for with AI3 tokens via an on-chain payment intent flow. The SDK handles all of the Auto Drive API interactions; you supply the on-chain transaction using your preferred EVM wallet library (wagmi, viem, ethers, etc.).

#### The flow

```
0. getStoragePrice(api)                  → optional: show live price estimate before payment
1. createPaymentIntent(api, sizeBytes)   → locks price, returns amount + contract details
2. send ai3AmountWei to contractAddress  → payIntent(intentId) on-chain (your wallet code)
3. watchPaymentTransaction(api, id, tx)  → notifies Auto Drive of your tx hash
4. waitForPaymentCompletion(api, id)     → polls until COMPLETED (credits applied)
```

#### Important: keep your API key server-side

`createPaymentIntent`, `watchPaymentTransaction`, and `getPaymentIntentStatus` all require an API key. In a web application these calls must be made from your server (e.g. a Next.js API route, an Express handler), not from the browser. `getStoragePrice` and `getPaymentContractInfo` are public endpoints and can be called from anywhere.

#### Getting a live price estimate

```typescript
// Public endpoint — no API key required. Good for showing a cost estimate
// before the user connects a wallet or commits to a payment.
const publicApi = createAutoDriveApi({ apiKey: null, network: NetworkId.MAINNET })
const { shannonsPerByte, ai3PerGb } = await publicApi.getStoragePrice()

console.log(`Current price: ${ai3PerGb} AI3/GB`)
```

#### Server-side example (Node / Next.js API route)

```typescript
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'

// Run on your server — never expose your API key to the browser
const api = createAutoDriveApi({ apiKey: process.env.AUTO_DRIVE_API_KEY!, network: NetworkId.MAINNET })

// Step 1 — create a price-locked intent for the content you want to store
const intent = await api.createPaymentIntent(contentSizeBytes)
// intent.ai3AmountWei  — exact amount to send (as a BigInt-safe string)
// intent.ai3Amount     — human-readable amount, e.g. "0.00123"
// intent.contractAddress — Credits Receiver contract on Auto EVM
// intent.intentId      — pass as the bytes32 arg to payIntent()
// intent.expiresAt     — ISO timestamp, intent expires after 10 minutes

// Step 2 — your client sends the on-chain transaction (see below)
// const txHash = await walletClient.writeContract({ ... })

// Step 3 — submit the tx hash so Auto Drive can watch it
await api.watchPaymentTransaction(intent.intentId, txHash)

// Step 4 — poll until credits are applied (or intent expires/fails)
const result = await api.waitForPaymentCompletion(intent.intentId)
// result: 'COMPLETED' | 'EXPIRED' | 'FAILED' | 'OVER_CAP'

if (result === 'COMPLETED') {
  console.log('Credits applied — ready to upload')
}
```

#### Client-side example (browser, using viem)

```typescript
import { createAutoDriveApi } from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'
import { createWalletClient, custom, parseGwei } from 'viem'

// Step 1 — fetch contract details (public endpoint, no API key needed)
const publicApi = createAutoDriveApi({ apiKey: null, network: NetworkId.MAINNET })
const contractInfo = await publicApi.getPaymentContractInfo()

// Step 2 — send the on-chain transaction with your wallet
const walletClient = createWalletClient({ transport: custom(window.ethereum) })
const [account] = await walletClient.requestAddresses()

const txHash = await walletClient.writeContract({
  address: contractInfo.contractAddress as `0x${string}`,
  abi: contractInfo.payIntentAbi,
  functionName: 'payIntent',
  args: [intent.intentId as `0x${string}`],
  value: BigInt(intent.ai3AmountWei),
})
// Then call your server route to run steps 3 and 4
```

#### Polling with custom options

```typescript
const result = await api.waitForPaymentCompletion(intent.intentId, {
  pollIntervalMs: 5_000,  // check every 5 seconds (default: 3 000)
  timeoutMs: 120_000,     // give up after 2 minutes (default: 300 000)
})
```

#### Checking intent status manually

```typescript
const { id, status } = await api.getPaymentIntentStatus(intent.intentId)
// status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'EXPIRED' | 'FAILED' | 'OVER_CAP'
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Additional Resources

- **Autonomys Academy**: Learn more at [Autonomys Academy](https://academy.autonomys.xyz).

## Contact

If you have any questions or need support, feel free to reach out:

- **GitHub Issues**: [GitHub Issues Page](https://github.com/autonomys/auto-sdk/issues)

We appreciate your feedback and contributions!
