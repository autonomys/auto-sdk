/* 
  This example demonstrates how to generate a Ed25519 key pair and export it as PEM format.
  The private key can be exported with or without password.
*/

import { createPrivateKey, createPublicKey } from 'crypto'
import { generateEd25519KeyPair, keyToPem } from '../src/keyManagement'

const [privateKeyEd25519, publicKeyEd25519] = generateEd25519KeyPair()
console.log(`Private key: ${privateKeyEd25519}`)
console.log(`Public key: ${publicKeyEd25519}`)
console.log(`========================`)

const privateKey2 = createPrivateKey({
  key: privateKeyEd25519,
  format: 'pem', // Input can still be PEM
})

const publicKey2 = createPublicKey(privateKeyEd25519)

console.log(keyToPem(privateKey2)) // Export without password
console.log(keyToPem(privateKey2, 'subspace')) // Export with password
console.log(keyToPem(publicKey2)) // Export public key
