# Autonomys Auto ID SDK

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)

## Overview

The **Autonomys Auto ID SDK** (`@autonomys/auto-id`) provides a suite of functions for managing Decentralized Identities (Auto IDs) on the Autonomys Network. It enables developers to:

- **Generate Auto IDs**: Create new decentralized identities for users.
- **Authenticate Users**: Verify user identities using their Auto IDs.
- **Revoke Auto IDs**: Remove Auto IDs when they are no longer needed or compromised.
- **Manage Certificates**: Handle x509 certificates associated with Auto IDs.
- **Integrate Zero-Knowledge Proofs (ZKPs)**: Utilize ZKP claims for enhanced privacy.

## Features

- **Auto ID Management**: Generate, authenticate, and revoke Auto IDs.
- **Certificate Handling**: Create and manage x509 certificates linked to Auto IDs.
- **Zero-Knowledge Proof Integration**: Implement privacy-preserving claims using ZKPs.
- **TypeScript Support**: Fully typed for enhanced developer experience.
- **Blockchain Interaction**: Interact with the Autonomys Network without dealing with low-level blockchain complexities.

---

## Installation

Install the package via npm or yarn:

```bash
# Using npm
npm install @autonomys/auto-id

# Using yarn
yarn add @autonomys/auto-id
```

---

## Getting Started

### Prerequisites

- **Node.js** (version 14 or higher)
- **TypeScript** (recommended for development)
- Familiarity with async/await and promise handling in JavaScript/TypeScript.
- **@autonomys/auto-utils** package installed (for utility functions and API activation).
- **@autonomys/auto-consensus** package if interacting with the consensus layer.

### Importing the SDK

You can import specific functions from the package as needed:

```typescript
import {
  generateAutoID,
  authenticateAutoIdUser,
  revokeAutoID,
  createCertificate,
  verifyCertificate,
} from '@autonomys/auto-id'
```

---

## Usage Examples

Below are examples demonstrating how to use the functions provided by `@autonomys/auto-id`.

---

### 1. Auto ID Management

#### **Generating a New Auto ID**

Create a new Auto ID for a user.

```typescript
import { generateAutoID } from '@autonomys/auto-id'
import { activateWallet } from '@autonomys/auto-utils'
;(async () => {
  // Activate a wallet using a mnemonic phrase
  const { api, accounts } = await activateWallet({
    mnemonic: 'your mnemonic phrase here', // Replace with your mnemonic
  })
  const account = accounts[0]

  // Generate a new Auto ID
  const autoID = await generateAutoID(api, account)
  console.log(`Generated Auto ID: ${autoID}`)

  // Disconnect when done
  await api.disconnect()
})()
```

**Parameters:**

- `api` (ApiPromise): Connected API instance.
- `account` (KeyringPair): The account generating the Auto ID.

**Returns:**

- A `Promise` that resolves to the new Auto ID (`string`).

---

#### **Authenticating a User with Auto ID**

Verify a user's identity using their Auto ID.

```typescript
import { authenticateAutoIdUser } from '@autonomys/auto-id'
import { activate } from '@autonomys/auto-utils'

;(async () => {
  // Activate the network API
  const api = await activate()

  // Challenge message that the user needs to sign
  const challengeMessage = 'Please sign this message to authenticate.'
  const challenge = new TextEncoder().encode(challengeMessage)

  // Assume the user provides the signature and their Auto ID
  const signature = new Uint8Array([...]) // User's signature as Uint8Array
  const autoId = 'user-auto-id' // The user's Auto ID

  // Authenticate the user
  const isAuthenticated = await authenticateAutoIdUser(api, autoId, challenge, signature)

  if (isAuthenticated) {
    console.log('User authenticated successfully.')
  } else {
    console.log('Authentication failed.')
  }

  // Disconnect when done
  await api.disconnect()
})()
```

**Parameters:**

- `api` (ApiPromise): Connected API instance.
- `autoId` (string): User's Auto ID.
- `challenge` (BufferSource): The challenge message.
- `signature` (BufferSource): User's signature over the challenge.

**Returns:**

- A `Promise` that resolves to `true` if authentication is successful, or `false` otherwise.

---

#### **Revoking an Auto ID**

Remove an Auto ID when it's no longer needed.

```typescript
import { revokeAutoID } from '@autonomys/auto-id'
import { activateWallet } from '@autonomys/auto-utils'
;(async () => {
  // Activate a wallet using a mnemonic phrase
  const { api, accounts } = await activateWallet({
    mnemonic: 'your mnemonic phrase here', // Replace with your mnemonic
  })
  const account = accounts[0]

  // The Auto ID to revoke
  const autoID = 'autoid_to_revoke' // Replace with the Auto ID to revoke

  // Revoke the Auto ID
  await revokeAutoID(api, account, autoID)
  console.log(`Revoked Auto ID: ${autoID}`)

  // Disconnect when done
  await api.disconnect()
})()
```

**Parameters:**

- `api` (ApiPromise): Connected API instance.
- `account` (KeyringPair): The account that owns the Auto ID.
- `autoID` (string): The Auto ID to revoke.

**Returns:**

- A `Promise` that resolves when the Auto ID has been revoked.

---

### 2. Certificate Management

#### **Creating a Self-Signed Certificate**

Generate a self-signed x509 certificate associated with an Auto ID.

```typescript
import { createCertificate } from '@autonomys/auto-id'
import { activateWallet } from '@autonomys/auto-utils'
;(async () => {
  // Activate a wallet
  const { accounts } = await activateWallet({
    mnemonic: 'your mnemonic phrase here', // Replace with your mnemonic
  })
  const account = accounts[0]

  // Generate a self-signed certificate
  const certificate = await createCertificate(account, 'CN=User Name')
  console.log('Certificate created:', certificate)

  // Optionally, save the certificate to a file or store it securely
})()
```

**Parameters:**

- `account` (KeyringPair): The account for which to create the certificate.
- `subjectName` (string): The subject name for the certificate (e.g., 'CN=User Name').

**Returns:**

- A `Promise` that resolves to the generated certificate.

---

#### **Verifying a Certificate**

Verify that a certificate is valid and trusted.

```typescript
import { verifyCertificate } from '@autonomys/auto-id'
;(async () => {
  // Assume you have the certificate and a trusted root certificate
  const certificate = '-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----'
  const trustedRootCertificate = '-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----'

  const isValid = await verifyCertificate(certificate, [trustedRootCertificate])

  if (isValid) {
    console.log('Certificate is valid and trusted.')
  } else {
    console.log('Certificate verification failed.')
  }
})()
```

**Parameters:**

- `certificate` (string): The PEM-encoded certificate to verify.
- `trustedRoots` (string[]): An array of PEM-encoded trusted root certificates.

**Returns:**

- A `Promise` that resolves to `true` if the certificate is valid, or `false` otherwise.

---

### 3. Zero-Knowledge Proofs (ZKPs)

#### **Creating a ZKP Claim**

Generate a Zero-Knowledge Proof claim using the Reclaim protocol.

```typescript
import { createZkpClaim } from '@autonomys/auto-id'
import { activateWallet } from '@autonomys/auto-utils'
import { Proof } from '@reclaimprotocol/js-sdk'

;(async () => {
  const { api, accounts } = await activateWallet({
    mnemonic: 'your mnemonic phrase here',
  })
  const account = accounts[0]

  // Assume you have a Reclaim proof (obtained from the Reclaim protocol)
  const proof: Proof = /* ... */

  // Create a ZKP claim
  const zkpClaim = await createZkpClaim(api, account, proof)
  console.log('ZKP Claim created:', zkpClaim)

  await api.disconnect()
})()
```

**Parameters:**

- `api` (ApiPromise): Connected API instance.
- `account` (KeyringPair): The account creating the claim.
- `proof` (Proof): The proof object from the Reclaim protocol.

**Returns:**

- A `Promise` that resolves to the created ZKP claim.

---

## API Reference

### Auto ID Functions

#### **`generateAutoID(api: ApiPromise, account: KeyringPair): Promise<string>`**

Generate a new Auto ID.

#### **`authenticateAutoIdUser(api: ApiPromise, autoId: string, challenge: BufferSource, signature: BufferSource): Promise<boolean>`**

Authenticate a user using their Auto ID.

#### **`revokeAutoID(api: ApiPromise, account: KeyringPair, autoID: string): Promise<void>`**

Revoke an existing Auto ID.

### Certificate Functions

#### **`createCertificate(account: KeyringPair, subjectName: string): Promise<string>`**

Create a self-signed x509 certificate for an account.

#### **`verifyCertificate(certificate: string, trustedRoots: string[]): Promise<boolean>`**

Verify the validity of a certificate against trusted roots.

### Zero-Knowledge Proof Functions

#### **`createZkpClaim(api: ApiPromise, account: KeyringPair, proof: Proof): Promise<ZkpClaim>`**

Create a ZKP claim using a proof.

---

## Error Handling

Ensure to handle errors appropriately, especially when dealing with network operations and cryptographic functions.

**Example:**

```typescript
import { generateAutoID } from '@autonomys/auto-id'
import { activateWallet } from '@autonomys/auto-utils'
;(async () => {
  try {
    const { api, accounts } = await activateWallet({
      mnemonic: 'your mnemonic phrase here',
    })
    const account = accounts[0]

    const autoID = await generateAutoID(api, account)
    console.log(`Generated Auto ID: ${autoID}`)

    await api.disconnect()
  } catch (error) {
    console.error('Error generating Auto ID:', error)
  }
})()
```

---

## Contributing

We welcome contributions to `@autonomys/auto-id`! Please follow these guidelines:

1. **Fork the repository** on GitHub.

2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/your-username/auto-sdk.git
   cd auto-sdk/packages/auto-id
   ```

3. **Install dependencies**:

   ```bash
   yarn install
   ```

4. **Make your changes** and ensure all tests pass:

   ```bash
   yarn test
   ```

5. **Commit your changes** with clear and descriptive messages.

6. **Push to your fork** and **create a pull request** against the `main` branch of the original repository.

### Code Style

- Use **TypeScript** for all code.
- Follow the existing coding conventions.
- Run `yarn lint` to ensure code style consistency.

### Testing

- Add tests for any new features or bug fixes.
- Ensure all existing tests pass.

---

## License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.

---

## Additional Resources

- **Autonomys Academy**: Learn more at [Autonomys Academy](https://academy.autonomys.xyz).
- **Auto-Utils Package**: Utility functions used alongside `auto-id` can be found in [`@autonomys/auto-utils`](../Auto-Utils/README.md).

---

## Contact

If you have any questions or need support, feel free to reach out:

- **GitHub Issues**: [GitHub Issues Page](https://github.com/autonomys/auto-sdk/issues)

We appreciate your feedback and contributions!
