# auto-drive

## auto-drive API Tools

The `auto-drive` package provides a set of tools to interact with the auto-drive API. Below are some key functionalities:

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
