/* 
    Simple RSA key pair generation
*/

import { generateRsaKeyPair, loadPrivateKey, saveKey } from '../src/keyManagement'

// Example usage:
const [privateKeyRsa, publicKeyRsa] = generateRsaKeyPair()
console.log(`Private key: ${privateKeyRsa}`)
console.log(`Public key: ${publicKeyRsa}`)
