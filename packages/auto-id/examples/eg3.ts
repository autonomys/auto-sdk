/* 
  This example demonstrates how to generate a RSA key pair and export it as PEM format.
  The private key can be exported with or without password.
*/

import { createPrivateKey, createPublicKey } from 'crypto'
import { generateRsaKeyPair, keyToPem } from '../src/keyManagement'

const [privateKeyRsa, publicKeyRsa] = generateRsaKeyPair()
console.log(`Private key: ${privateKeyRsa}`)
console.log(`Public key: ${publicKeyRsa}`)
console.log(`========================`)

const privateKey2 = createPrivateKey({
  key: privateKeyRsa,
  format: 'pem', // Input can still be PEM
})

const publicKey2 = createPublicKey(privateKeyRsa)

console.log(keyToPem(privateKey2)) // Export without password
console.log(keyToPem(privateKey2, 'subspace')) // Export with password
console.log(keyToPem(publicKey2)) // Export public key
