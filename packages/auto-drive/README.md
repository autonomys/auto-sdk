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
const api = createAutoDriveApi({
  apiKey: process.env.AUTO_DRIVE_API_KEY!,
  network: NetworkId.MAINNET,
})

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
  pollIntervalMs: 5_000, // check every 5 seconds (default: 3 000)
  timeoutMs: 120_000, // give up after 2 minutes (default: 300 000)
})
```

#### Checking intent status manually

```typescript
const { id, status } = await api.getPaymentIntentStatus(intent.intentId)
// status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'EXPIRED' | 'FAILED' | 'OVER_CAP'
```

#### Checking the credit cap before payment

By default `createPaymentIntent` does not send the purchase size to Auto Drive. Pass `{ checkCreditCap: true }` to send it. Auto Drive then rejects a purchase that would exceed your per-user credit cap before anything is paid:

```typescript
import { PaymentApiError } from '@autonomys/auto-drive'

try {
  const intent = await api.createPaymentIntent(contentSizeBytes, { checkCreditCap: true })
} catch (error) {
  if (error instanceof PaymentApiError && error.code === 'CREDIT_CAP_EXCEEDED') {
    // Nothing was paid. Try a smaller size.
  }
}
```

### Pay with USDC — purchasing storage credits with USDC on Ethereum

You can also buy storage credits with USDC on Ethereum. As with AI3, the SDK makes the Auto Drive API calls and your wallet library signs the transactions. The SDK does not sign anything and has no dependency on viem or ethers.

#### The flow

```
1. createUsdcPaymentIntent(api, sizeBytes)        → locks a USDC price, returns amount + chain, token and receiver
2. approve(receiverAddress, usdcAmount)           → on tokenAddress, on chainId (your wallet code)
3. payIntentWithToken(intentId, usdcAmount)       → on receiverAddress, no value (your wallet code)
4. watchPaymentTransaction(api, id, tx)           → the hash from step 3, not step 2
5. waitForPaymentCompletion(api, id, { settleGraceMs })  → polls until COMPLETED
```

All of these calls need an API key, so make them from your server. `createUsdcPaymentIntent` gets the chain ID, receiver address and token address from Auto Drive (`getUsdcPaymentTarget`). Always use those values. Do not hardcode them.

The SDK exports two minimal ABIs for the wallet calls:

- `erc20ApprovalAbi`: `approve`, `allowance` and `balanceOf`. It does not include `transfer` or `transferFrom`, because the receiver contract pulls the tokens itself.
- `usdcReceiverAbi`: `payIntentWithToken(bytes32 intentId, uint256 amount)`.

#### Example (Node, using viem)

```typescript
import {
  createAutoDriveApi,
  erc20ApprovalAbi,
  PaymentApiError,
  usdcReceiverAbi,
} from '@autonomys/auto-drive'
import { NetworkId } from '@autonomys/auto-utils'
import { createPublicClient, createWalletClient, http, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, sepolia } from 'viem/chains'

const api = createAutoDriveApi({
  apiKey: process.env.AUTO_DRIVE_API_KEY!,
  network: NetworkId.MAINNET,
})

// Step 1 — lock a USDC price for 1 GiB. Accepts a number or a bigint.
const intent = await api.createUsdcPaymentIntent(BigInt(1024) ** BigInt(3))
// intent.usdcAmount          — exact amount in base units (6 decimals), as a BigInt-safe string
// intent.usdcAmountFormatted — human-readable amount, e.g. "2.500001"
// intent.chainId, intent.tokenAddress, intent.receiverAddress — where to pay
// intent.expiresAt           — ISO timestamp, the price is locked for 10 minutes

// Use the chain that Auto Drive names. Do not pick one yourself.
const chain = [mainnet, sepolia].find((c) => c.id === intent.chainId)
if (!chain) throw new Error(`Unsupported USDC chain ${intent.chainId}`)

const account = privateKeyToAccount(process.env.PAYER_PRIVATE_KEY as Hex)
const transport = http(process.env.ETH_RPC_URL)
const publicClient = createPublicClient({ chain, transport })
const walletClient = createWalletClient({ account, chain, transport })

const amount = BigInt(intent.usdcAmount)
const token = intent.tokenAddress as Hex
const receiver = intent.receiverAddress as Hex

// Step 2 — approve the receiver to pull the USDC (skip if the allowance is enough)
const allowance = await publicClient.readContract({
  address: token,
  abi: erc20ApprovalAbi,
  functionName: 'allowance',
  args: [account.address, receiver],
})
if (allowance < amount) {
  const approveHash = await walletClient.writeContract({
    address: token,
    abi: erc20ApprovalAbi,
    functionName: 'approve',
    args: [receiver, amount],
  })
  await publicClient.waitForTransactionReceipt({ hash: approveHash })
}

// Step 3 — pay the intent. No value: the receiver pulls the approved USDC.
const txHash = await walletClient.writeContract({
  address: receiver,
  abi: usdcReceiverAbi,
  functionName: 'payIntentWithToken',
  args: [intent.intentId as Hex, amount],
})
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
if (receipt.status !== 'success') throw new Error(`USDC payment reverted: ${txHash}`)

// Step 4 — tell Auto Drive about the payment transaction (not the approval)
try {
  await api.watchPaymentTransaction(intent.intentId, txHash)
} catch (error) {
  // 410: the price lock has lapsed. The payment can still settle, so continue.
  if (!(error instanceof PaymentApiError && error.status === 410)) throw error
}

// Step 5 — wait for credits. Pass settleGraceMs so a 410 does not end the wait too early.
const result = await api.waitForPaymentCompletion(intent.intentId, {
  settleGraceMs: intent.settleGraceMs,
})
// result: 'COMPLETED' | 'EXPIRED' | 'FAILED' | 'OVER_CAP'
```

#### Why `settleGraceMs` matters

`GET /intents/:id` answers HTTP 410 as soon as the 10-minute price lock lapses. A payment sent near the end of the lock can still be credited after that. With `settleGraceMs` set, `waitForPaymentCompletion` keeps polling through 410 for that long and only then returns `'EXPIRED'`. Without it, a 410 throws a `PaymentApiError`, as in earlier versions. Auto Drive serves the value in the payment target, and `createUsdcPaymentIntent` copies it onto the intent.

#### Handling errors

When Auto Drive refuses a payment request, the SDK throws a `PaymentApiError`. It has the HTTP `status` and, for coded errors, a machine-readable `code`:

| `code`                      | Status | What to do                                           |
| --------------------------- | ------ | ---------------------------------------------------- |
| `PRICE_ORACLE_UNAVAILABLE`  | 503    | Retry the same request later                         |
| `PRICE_UNSTABLE`            | 503    | Retry the same request later                         |
| `USDC_PAYMENTS_UNAVAILABLE` | 503    | USDC is closed for now. Pay with AI3, or retry later |
| `USDC_PAYMENTS_DISABLED`    | 403    | USDC is not available to you. Pay with AI3           |
| `CREDIT_CAP_EXCEEDED`       | 403    | The purchase would exceed your credit cap. Buy less  |
| `GOOGLE_ACCOUNT_REQUIRED`   | 403    | Use an API key from a Google-registered account      |

```typescript
try {
  const intent = await api.createUsdcPaymentIntent(sizeBytes)
} catch (error) {
  if (!(error instanceof PaymentApiError)) throw error
  switch (error.code) {
    case 'PRICE_ORACLE_UNAVAILABLE':
    case 'PRICE_UNSTABLE':
      // retry later
      break
    case 'USDC_PAYMENTS_DISABLED':
    case 'USDC_PAYMENTS_UNAVAILABLE':
      // fall back to api.createPaymentIntent (AI3)
      break
    default:
      throw error
  }
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
