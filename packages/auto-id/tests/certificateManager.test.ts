import { createPublicKey } from 'crypto'
import * as forge from 'node-forge'
import CertificateManager from '../src/certificateManager'
import {
  doPublicKeysMatch,
  generateEd25519KeyPair,
  generateRsaKeyPair,
  pemToPrivateKey,
  pemToPublicKey,
} from '../src/keyManagement'

describe('CertificateManager', () => {
  it('creates and signs a CSR with an Ed25519 key', () => {
    // Generate an Ed25519 key pair
    const [privateKey, _] = generateEd25519KeyPair()
    // const keypair = forge.pki.ed25519.generateKeyPair()

    // Define the subject name for the CSR
    const subjectName = 'Test'

    // Instantiate CertificateManager with the generated private key
    const manager = new CertificateManager(null, pemToPrivateKey(privateKey))

    // Create and sign CSR
    const csr = manager.create_and_sign_csr(subjectName)

    // Assert that the CSR is not null
    expect(csr).toBeDefined()

    // Assert that the CSR subject name matches the provided subject name
    const commonNameField = csr.subject.attributes.find((attr) => attr.name === 'commonName')
    expect(commonNameField?.value).toEqual(subjectName)

    // Get the derived public key (in forge) from original private key.
    // private key (PEM) -> private key(KeyObject) -> public key(PEM)
    const derivedPublicKeyObj = pemToPublicKey(
      CertificateManager.pemPublicFromPrivateKey(pemToPrivateKey(privateKey)),
    )

    // Assert that the CSR public key matches the public key from the key pair
    if (csr.publicKey) {
      // Convert forge.PublicKey format to crypto.KeyObject
      const csrPublicKeyObj = createPublicKey(forge.pki.publicKeyToPem(csr.publicKey))

      expect(doPublicKeysMatch(csrPublicKeyObj, derivedPublicKeyObj)).toBe(true)
    } else {
      throw new Error('CSR does not have a public key.')
    }
  })

  it('create and sign CSR with RSA key', () => {
    // Generate a RSA key pair
    const [privateKey, _] = generateRsaKeyPair()

    // Instantiate CertificateManager with the generated private key
    const certificateManager = new CertificateManager(null, pemToPrivateKey(privateKey))

    // Create and sign a CSR
    const subjectName = 'Test'
    const csr = certificateManager.create_and_sign_csr(subjectName)

    expect(csr).toBeDefined()

    // Assert that the CSR subject name matches the provided subject name
    const commonNameField = csr.subject.attributes.find((attr) => attr.name === 'commonName')
    expect(commonNameField?.value).toEqual(subjectName)

    // Get the derived public key (in forge) from original private key.
    // private key (PEM) -> private key(KeyObject) -> public key(PEM)
    const derivedPublicKeyObj = pemToPublicKey(
      CertificateManager.pemPublicFromPrivateKey(pemToPrivateKey(privateKey)),
    )

    // Assert that the CSR public key matches the public key from the key pair
    if (csr.publicKey) {
      // Convert forge.PublicKey format to crypto.KeyObject
      const csrPublicKeyObj = createPublicKey(forge.pki.publicKeyToPem(csr.publicKey))

      expect(doPublicKeysMatch(csrPublicKeyObj, derivedPublicKeyObj)).toBe(true)
    } else {
      throw new Error('CSR does not have a public key.')
    }
  })
})
