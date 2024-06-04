/* 
  Simple Ed25519 key pair generation
*/

import { generateEd25519KeyPair, loadPrivateKey, saveKey } from '../src/keyManagement'

// Example usage:
const [privateKey, publicKey] = generateEd25519KeyPair()
console.log(`Private key: ${privateKey}`)
console.log(`Public key: ${publicKey}`)
