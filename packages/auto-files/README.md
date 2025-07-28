# Auto Files

A TypeScript client library for interacting with the Auto Files service API.

## Installation

```bash
npm install @autonomys/auto-files
```

## Usage

### Basic Setup

```typescript
import { createAutoFilesApi } from '@autonomys/auto-files'

const api = createAutoFilesApi('https://api.autofiles.com', 'your-api-secret')
```

### File Operations

#### Get File

```typescript
import { createAutoFilesApi } from '@autonomys/auto-files'

const api = createAutoFilesApi('https://api.autofiles.com', 'your-api-secret')

try {
  const fileStream = await api.getFile('your-file-cid', {
    retriesPerFetch: 3,
    onProgress: (progress) => {
      console.log(`Download progress: ${progress * 100}%`)
    },
    ignoreCache: false,
  })

  // Handle the file stream
  fileStream.pipe(process.stdout)
} catch (error) {
  console.error('Error downloading file:', error)
}
```

#### Get Chunked File

```typescript
import { createAutoFilesApi } from '@autonomys/auto-files'

const api = createAutoFilesApi('https://api.autofiles.com', 'your-api-secret')

try {
  const file = await api.getChunkedFile('your-file-cid', {
    retriesPerFetch: 3,
    onProgress: (progress) => {
      console.log(`Download progress: ${progress * 100}%`)
    },
  })

  console.log(`File size: ${file.length} bytes`)
  console.log(`Compression: ${file.compression ? 'Yes' : 'No'}`)
  console.log(`Encryption: ${file.encryption ? 'Yes' : 'No'}`)

  // Handle the file data stream
  file.data.pipe(process.stdout)
} catch (error) {
  console.error('Error downloading chunked file:', error)
}
```

#### Check File Cache Status

```typescript
import { createAutoFilesApi } from '@autonomys/auto-files'

const api = createAutoFilesApi('https://api.autofiles.com', 'your-api-secret')

try {
  const isCached = await api.isFileCached('your-file-cid')
  console.log(`File is cached: ${isCached}`)
} catch (error) {
  console.error('Error checking file cache status:', error)
}
```

#### Get Node

```typescript
import { createAutoFilesApi } from '@autonomys/auto-files'

const api = createAutoFilesApi('https://api.autofiles.com', 'your-api-secret')

try {
  const nodeData = await api.getNode('your-node-cid')
  console.log(`Node data size: ${nodeData.byteLength} bytes`)
} catch (error) {
  console.error('Error fetching node:', error)
}
```

### Moderation Operations

#### Ban a File

```typescript
import { createAutoFilesApi } from '@autonomys/auto-files'

const api = createAutoFilesApi('https://api.autofiles.com', 'your-api-secret')

try {
  await api.banFile('your-file-cid')
  console.log('File banned successfully')
} catch (error) {
  console.error('Error banning file:', error)
}
```

#### Unban a File

```typescript
import { createAutoFilesApi } from '@autonomys/auto-files'

const api = createAutoFilesApi('https://api.autofiles.com', 'your-api-secret')

try {
  await api.unbanFile('your-file-cid')
  console.log('File unbanned successfully')
} catch (error) {
  console.error('Error unbanning file:', error)
}
```

#### Get Banned Files

```typescript
import { createAutoFilesApi } from '@autonomys/auto-files'

const api = createAutoFilesApi('https://api.autofiles.com', 'your-api-secret')

try {
  const bannedFiles = await api.getBannedFiles(1, 10)
  console.log(`Found ${bannedFiles.length} banned files`)

  for (const cid of bannedFiles) {
    console.log(`CID: ${cid}`)
  }
} catch (error) {
  console.error('Error fetching banned files:', error)
}
```

## API Reference

### `createAutoFilesApi(baseUrl: string, apiSecret: string)`

Creates an API client instance.

**Parameters:**

- `baseUrl` - The base URL of the Auto Files API
- `apiSecret` - The API secret key for authentication

**Returns:** An object containing methods to interact with the API

### File Methods

#### `getFile(cid: string, options?: GetFileOptions)`

Fetches a complete file from the API.

**Parameters:**

- `cid` - The content identifier of the file
- `options` - Optional configuration
  - `retriesPerFetch` - Number of retry attempts (default: 3)
  - `onProgress` - Progress callback function (0-1)
  - `ignoreCache` - Whether to ignore cache (default: false)

**Returns:** Promise<Readable> - File data stream

#### `getChunkedFile(cid: string, options?: GetChunkedFileOptions)`

Fetches a complete file with metadata.

**Parameters:**

- `cid` - The content identifier of the file
- `options` - Optional configuration
  - `retriesPerFetch` - Number of retry attempts (default: 3)
  - `onProgress` - Progress callback function (0-1)

**Returns:** Promise<FetchedFile> - File with metadata and data stream

#### `isFileCached(cid: string)`

Checks if a file is cached on the gateway.

**Parameters:**

- `cid` - The content identifier of the file

**Returns:** Promise<boolean> - Whether the file is cached

#### `getNode(cid: string)`

Fetches a specific node from the API.

**Parameters:**

- `cid` - The CID of the node

**Returns:** Promise<ArrayBuffer> - Node data

### Moderation Methods

#### `banFile(cid: string)`

Bans a file by sending a request to the moderation service.

**Parameters:**

- `cid` - The content identifier of the file to ban

**Returns:** Promise<void>

#### `unbanFile(cid: string)`

Unbans a file by sending a request to the moderation service.

**Parameters:**

- `cid` - The content identifier of the file to unban

**Returns:** Promise<void>

#### `getBannedFiles(page?: number, limit?: number)`

Gets a list of banned files with pagination support.

**Parameters:**

- `page` - The page number for pagination (default: 1)
- `limit` - The number of files per page (default: 10)

**Returns:** Promise<BannedFilesResponse>

## Types

### `FetchedFile`

```typescript
interface FetchedFile {
  length: bigint
  compression: CompressionOptions | undefined
  encryption: EncryptionOptions | undefined
  data: Readable
}
```

### `BannedFile`

```typescript
interface BannedFile {
  cid: string
  bannedAt: string
  reason?: string
  bannedBy?: string
}
```

### `BannedFilesResponse`

```typescript
interface BannedFilesResponse {
  bannedFiles: BannedFile[]
  totalCount?: number
  page?: number
  limit?: number
}
```

## Error Handling

All methods throw errors when API requests fail. Errors include HTTP status codes and descriptive messages.

```typescript
try {
  await api.banFile('invalid-cid')
} catch (error) {
  console.error('Error:', error.message)
  // Example: "Error banning file: 400 Bad Request"
}
```

## License

This project is licensed under the MIT License.
