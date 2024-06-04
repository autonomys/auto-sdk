/* 
  This example demonstrates how to generate a Ed25519 key pair and export it as PEM format.
  The private key can be exported with or without password.
*/

import { createPrivateKey, createPublicKey } from 'crypto'
import { generateEd25519KeyPair, keyToPem, saveKey } from '../src/keyManagement'

const [privateKeyEd25519, publicKeyEd25519] = generateEd25519KeyPair()
console.log(`Private key: ${privateKeyEd25519}`)
console.log(`Public key: ${publicKeyEd25519}`)
console.log(`========================`)

const privateKeyObject = createPrivateKey({
  key: privateKeyEd25519,
  format: 'pem', // Input can still be PEM
})

const publicKeyObject = createPublicKey(privateKeyEd25519)

console.log(keyToPem(privateKeyObject)) // Export without password
console.log(keyToPem(privateKeyObject, 'subspace')) // Export with password
console.log(keyToPem(publicKeyObject)) // Export public key

// w/o password
saveKey(privateKeyObject, './privateKey.pem')
  .then(() => console.log('Key saved successfully'))
  .catch((err) => console.error('Error saving key:', err))
// with password i.e. encrypted key
saveKey(privateKeyObject, './privateKeyPassword.pem', 'subspace')
  .then(() => console.log('Key (with password) saved successfully'))
  .catch((err) => console.error('Error saving key:', err))

// const loadedPrivateKey = loadPrivateKey('./privateKey.pem')
// console.log(`Private keys match: ${loadedPrivateKey.toString() === privateKey.toString()}`)
