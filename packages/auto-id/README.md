# Autonomys Auto ID SDK

![Autonomys Banner](https://github.com/autonomys/auto-sdk/blob/main/.github/images/autonomys-banner.webp)

[![Latest Github release](https://img.shields.io/github/v/tag/autonomys/auto-sdk.svg)](https://github.com/autonomys/auto-sdk/tags)
[![Build status of the main branch on Linux/OSX](https://img.shields.io/github/actions/workflow/status/autonomys/auto-sdk/build.yaml?branch=main&label=Linux%2FOSX%20build)](https://github.com/autonomys/auto-sdk/actions/workflows/build.yaml)
[![npm version](https://badge.fury.io/js/@autonomys%2Fauto-id.svg)](https://badge.fury.io/js/@autonomys/auto-id)

## Overview

The **Autonomys Auto ID SDK** (`@autonomys/auto-id`) provides functionalities for managing certificates, authenticating users, and integrating Zero-Knowledge Proofs (ZKPs) on the Autonomys Network. It enables developers to:

- **Authenticate Users**: Verify user identities using their Auto IDs.
- **Manage Certificates**: Create, issue, and handle x509 certificates associated with Auto IDs.
- **Integrate Zero-Knowledge Proofs (ZKPs)**: Utilize ZKP claims for enhanced privacy and authentication.

## Features

- **Certificate Management**: Create and manage x509 certificates linked to Auto IDs.
- **Zero-Knowledge Proof Integration**: Implement privacy-preserving claims using ZKPs.
- **User Authentication**: Authenticate users through their Auto IDs and certificates.
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

### Importing the SDK

You can import specific functions from the package as needed:

```typescript
import {
  authenticateAutoIdUser,
  selfIssueCertificate,
  issueCertificate,
  createAndSignCSR,
  ReclaimZKPClaim,
  buildReclaimRequest,
} from '@autonomys/auto-id'
```

---

## Usage Examples

Below are examples demonstrating how to use the functions provided by `@autonomys/auto-id`.

---

### 1. User Authentication

#### **Authenticate a User with Auto ID**

Verify a user's identity using their Auto ID, challenge message, and signature.

```typescript
import { authenticateAutoIdUser } from '@autonomys/auto-id';
import { activate } from '@autonomys/auto-utils';

(async () => {
  // Activate the network API
  const api = await activate();

  // User's Auto ID
  const autoId = 'user-auto-id'; // Replace with the user's Auto ID

  // Challenge message that the user needs to sign
  const challengeMessage = 'Please sign this message to authenticate.';
  const challenge = new TextEncoder().encode(challengeMessage);

  // Assume the user provides the signature
  const signature = new Uint8Array([...]); // User's signature as Uint8Array

  // Authenticate the user
  const isAuthenticated = await authenticateAutoIdUser(api, autoId, challenge, signature);

  if (isAuthenticated) {
    console.log('User authenticated successfully.');
  } else {
    console.log('Authentication failed.');
  }

  // Disconnect when done
  await api.disconnect();
})();
```

**Parameters:**

- `api` (`ApiPromise`): Connected API instance.
- `autoId` (`string`): User's Auto ID.
- `challenge` (`BufferSource`): The challenge message.
- `signature` (`BufferSource`): User's signature over the challenge.

**Returns:**

- A `Promise` that resolves to `true` if authentication is successful, or `false` otherwise.

---

### 2. Certificate Management

#### **Self-Issuing a Certificate**

Generate a self-signed x509 certificate for an Auto ID.

```typescript
import { selfIssueCertificate } from '@autonomys/auto-id'
import { generateKeyPair } from '@autonomys/auto-utils'

;(async () => {
  // Generate a key pair
  const keyPair = await generateKeyPair()

  // Subject name for the certificate
  const subjectName = 'CN=User Name' // Replace with appropriate subject

  // Generate a self-signed certificate
  const certificate = await selfIssueCertificate(subjectName, keyPair)

  console.log('Certificate created:', certificate)

  // Optionally, save the certificate to a file or store it securely
})()
```

**Parameters:**

- `subjectName` (`string`): The subject name for the certificate (e.g., 'CN=User Name').
- `keyPair` (`CryptoKeyPair`): The key pair for the certificate.

**Returns:**

- A `Promise` that resolves to the generated `X509Certificate`.

#### **Issuing a Certificate**

Issue a certificate based on a Certificate Signing Request (CSR).

```typescript
import { createAndSignCSR, issueCertificate, selfIssueCertificate } from '@autonomys/auto-id'
import { generateKeyPair } from '@autonomys/auto-utils'

;(async () => {
  // Generate key pairs for the subject and issuer
  const subjectKeyPair = await generateKeyPair()
  const issuerKeyPair = await generateKeyPair()

  // Subject and issuer names
  const subjectName = 'CN=Subject Name'
  const issuerName = 'CN=Issuer Name'

  // Create issuer's self-signed certificate
  const issuerCertificate = await selfIssueCertificate(issuerName, issuerKeyPair)

  // Create and sign CSR for the subject
  const csr = await createAndSignCSR(subjectName, subjectKeyPair)

  // Issue certificate for the subject using issuer's certificate and key pair
  const issuedCertificate = await issueCertificate(csr, {
    certificate: issuerCertificate,
    keyPair: issuerKeyPair,
  })

  console.log('Issued Certificate:', issuedCertificate)
})()
```

**Parameters for `issueCertificate`:**

- `csr` (`Pkcs10CertificateRequest`): The CSR from the subject.
- `issuerCertificateData` (`CertificateData`): Contains the issuer's certificate and key pair.
- `validityPeriodDays` (`number`, optional): Certificate validity period in days.

**Returns:**

- A `Promise` that resolves to the issued `X509Certificate`.

---

### 3. Zero-Knowledge Proofs (ZKPs)

#### **Creating a ZKP Claim**

Generate a Zero-Knowledge Proof claim using the Reclaim protocol.

```typescript
import { ReclaimZKPClaim, buildReclaimRequest } from '@autonomys/auto-id'
import { Proof } from '@reclaimprotocol/js-sdk'

;(async () => {
  // Application ID from Reclaim Protocol
  const appId = 'your-app-id' // Replace with your actual app ID

  // Supported claim hash (e.g., 'GoogleEmail')
  const claimType = 'GoogleEmail'

  // Build a Reclaim proof request
  const reclaimRequest = await buildReclaimRequest(appId, claimType)

  // Start the Reclaim session and get the proof (this may involve user interaction)
  const proofs = await reclaimRequest.startSession({
    onSuccessCallback: (proofs) => {
      // Handle the proofs
      const proof = proofs[0]

      // Create a ZKP claim
      const zkpClaim = new ReclaimZKPClaim('your-service-id', proof)

      // Verify the proof validity
      zkpClaim.verify().then((isValid) => {
        if (isValid) {
          console.log('ZKP Claim is valid:', zkpClaim)
        } else {
          console.log('ZKP Claim verification failed.')
        }
      })
    },
    onFailureCallback: (error) => {
      console.error('Reclaim session failed:', error)
    },
  })
})()
```

**Parameters:**

- `serviceId` (`string`): An identifier for your service.
- `proof` (`Proof`): The proof object obtained from the Reclaim protocol.

**Returns:**

- A `Promise` that resolves when the ZKP claim has been processed.

---

## API Reference

### Functions

#### **`authenticateAutoIdUser(api: ApiPromise, autoId: string, challenge: BufferSource, signature: BufferSource): Promise<boolean>`**

Authenticate a user using their Auto ID.

#### **`selfIssueCertificate(subjectName: string, keyPair: CryptoKeyPair, validityPeriodDays?: number): Promise<X509Certificate>`**

Create a self-signed x509 certificate.

#### **`issueCertificate(csr: Pkcs10CertificateRequest, issuerCertificateData: CertificateData, validityPeriodDays?: number): Promise<X509Certificate>`**

Issue a certificate based on a CSR.

#### **`createAndSignCSR(subjectName: string, keyPair: CryptoKeyPair): Promise<Pkcs10CertificateRequest>`**

Create and sign a Certificate Signing Request.

#### **`buildReclaimRequest(appId: string, claimType: SupportedClaimHashes): Promise<ProofRequest>`**

Build a Reclaim proof request for a specific claim type.

---

## Error Handling

Ensure to handle errors appropriately, especially when dealing with network operations and cryptographic functions.

**Example:**

```typescript
import { selfIssueCertificate } from '@autonomys/auto-id'
import { generateKeyPair } from '@autonomys/auto-utils'

;(async () => {
  try {
    const keyPair = await generateKeyPair()
    const subjectName = 'CN=User Name'

    const certificate = await selfIssueCertificate(subjectName, keyPair)
    console.log('Certificate created:', certificate)
  } catch (error) {
    console.error('Error creating certificate:', error)
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
