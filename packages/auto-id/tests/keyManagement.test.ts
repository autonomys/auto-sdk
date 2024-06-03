import { expect, test } from '@jest/globals'
import { KeyObject, createPrivateKey, createPublicKey } from 'crypto'
import {
  generateEd25519KeyPair,
  generateRsaKeyPair,
  keyToPem,
  pemToPrivateKey,
} from '../src/keyManagement'

describe('Generate keypair for', () => {
  test('RSA', () => {
    const [privateKey, publicKey] = generateRsaKeyPair()
    expect(privateKey).toStrictEqual(expect.any(String))
    expect(publicKey).toStrictEqual(expect.any(String))
  })

  test('Ed25519', () => {
    const [privateKey, publicKey] = generateEd25519KeyPair()
    expect(privateKey).toStrictEqual(expect.any(String))
    expect(publicKey).toStrictEqual(expect.any(String))
  })
})

describe('Private/Public key to PEM with/without password for', () => {
  let privateKey: string, publicKey: string

  test('RSA', () => {
    ;[privateKey, publicKey] = generateRsaKeyPair()
  })

  test('Ed25519', () => {
    ;[privateKey, publicKey] = generateEd25519KeyPair()
  })

  afterEach(() => {
    const privateKeyObject = createPrivateKey({
      key: privateKey,
      format: 'pem', // Input can still be PEM
    })
    const publicKeyKeyObject = createPublicKey(privateKeyObject)

    expect(keyToPem(privateKeyObject)).toStrictEqual(privateKey)
    expect(keyToPem(privateKeyObject, 'subspace')).not.toEqual(privateKey) // unequal because of password encryption
    expect(keyToPem(publicKeyKeyObject)).toStrictEqual(publicKey)
  })
})

// TODO: Add code snippet for public key as well intermittently
describe('PEM to Private/Public key for', () => {
  const keyGenerators = [
    { name: 'RSA', generator: generateRsaKeyPair },
    { name: 'Ed25519', generator: generateEd25519KeyPair },
  ]

  for (const { name, generator } of keyGenerators) {
    describe(`${name}`, () => {
      let privateKeyObject: KeyObject
      let originalPem: string

      beforeEach(() => {
        const [privateKey, publicKey] = generator()

        privateKeyObject = createPrivateKey({
          key: privateKey,
          format: 'pem', // Input format is PEM
        })

        const publicKeyObject = createPublicKey(privateKeyObject)

        // Export original key back to PEM for comparison
        originalPem = privateKeyObject.export({ type: 'pkcs8', format: 'pem' }) as string
      })

      test('without any password', () => {
        // Convert the privateKeyObject back to PEM ensure consistent serialization
        // And then convert it back to a private key object
        const privateKeyFromPem = pemToPrivateKey(keyToPem(privateKeyObject))

        // Export derived key back to PEM for comparison
        const derivedPem = privateKeyFromPem.export({ type: 'pkcs8', format: 'pem' }) as string

        expect(derivedPem).toStrictEqual(originalPem)
      })

      test('with password in 1/2 function', () => {
        // Convert the privateKeyObject back to PEM ensure consistent serialization
        // And then convert it back to a private key object with password
        const privateKeyFromPemPassword = pemToPrivateKey(keyToPem(privateKeyObject), 'subspace')

        // Export both original and derived keys back to PEM and compare those
        const derivedPemPassword = privateKeyFromPemPassword.export({
          type: 'pkcs8',
          format: 'pem',
        }) as string

        expect(derivedPemPassword).toStrictEqual(originalPem)
      })

      test('with password in 2/2 functions', () => {
        // Convert the privateKeyObject back to PEM with password ensure consistent serialization
        // And then convert it back to a private key object with password
        const privateKeyFromPemPassword = pemToPrivateKey(
          keyToPem(privateKeyObject, 'subspace'),
          'subspace',
        )

        // Export both original and derived keys back to PEM and compare those
        const derivedPemPassword = privateKeyFromPemPassword.export({
          type: 'pkcs8',
          format: 'pem',
        }) as string

        expect(derivedPemPassword).toStrictEqual(originalPem)
      })
    })
  }
})
