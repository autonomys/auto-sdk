/* 
  Ed25519 key pair generation and saving/loading example
*/

import { generateEd25519KeyPair, loadPrivateKey, saveKey } from '../src/keyManagement'

// Example usage:
const [privateKey, publicKey] = generateEd25519KeyPair()
console.log(`Private key: ${privateKey}`)
console.log(`Public key: ${publicKey}`)

saveKey(Buffer.from(privateKey), './privateKey.pem')
const loadedPrivateKey = loadPrivateKey('./privateKey.pem')
console.log(`Private keys match: ${loadedPrivateKey.toString() === privateKey.toString()}`)
