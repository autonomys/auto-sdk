/* 
  This example demonstrates how to generate a RSA key pair and export it as PEM format.
  The private key can be exported with or without password.
*/

import { createPrivateKey, createPublicKey } from 'crypto'
import { generateRsaKeyPair, keyToPem, loadPrivateKey, saveKey } from '../src/keyManagement'

const [privateKeyRsa, publicKeyRsa] = generateRsaKeyPair()
console.log(`Private key: ${privateKeyRsa}`)
console.log(`Public key: ${publicKeyRsa}`)
console.log(`========================`)

const privateKeyObject = createPrivateKey({
  key: privateKeyRsa,
  format: 'pem', // Input can still be PEM
})

const publicKeyKeyObject = createPublicKey(privateKeyObject)

console.log(keyToPem(privateKeyObject)) // Export without password
console.log(keyToPem(privateKeyObject, 'subspace')) // Export with password
console.log(keyToPem(publicKeyKeyObject)) // Export public key

// w/o password
saveKey(privateKeyObject, './privateKey.pem')
  .then(() => console.log('Key saved successfully'))
  .catch((err) => console.error('Error saving key:', err))
// with password i.e. encrypted key
saveKey(privateKeyObject, './privateKeyPassword.pem', 'subspace')
  .then(() => console.log('Encrypted Key (with password) saved successfully'))
  .catch((err) => console.error('Error saving key:', err))

loadPrivateKey('./privateKey.pem')
  .then((key) => {
    console.log(`Private keys match: ${key.toString() === privateKeyObject.toString()}`)
  })
  .catch((err) => console.error('Error loading key:', err))
