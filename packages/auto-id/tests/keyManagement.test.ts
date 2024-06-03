import { expect, test } from '@jest/globals'
import { KeyObject, createPrivateKey, createPublicKey } from 'crypto'
import {
  doPublicKeysMatch,
  generateEd25519KeyPair,
  generateRsaKeyPair,
  keyToHex,
  keyToPem,
  pemToPrivateKey,
  pemToPublicKey,
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
    const publicKeyObject = createPublicKey(privateKeyObject)

    expect(keyToPem(privateKeyObject)).toStrictEqual(privateKey)
    expect(keyToPem(privateKeyObject, 'subspace')).not.toEqual(privateKey) // unequal because of password encryption
    expect(keyToPem(publicKeyObject)).toStrictEqual(publicKey)
  })
})

describe('PEM to Private/Public key for', () => {
  const keyGenerators = [
    { name: 'RSA', generator: generateRsaKeyPair },
    { name: 'Ed25519', generator: generateEd25519KeyPair },
  ]

  for (const { name, generator } of keyGenerators) {
    describe(`${name}`, () => {
      let privateKeyObject: KeyObject, publicKeyObject: KeyObject
      let originalPemPrivKey: string, originalPemPubKey: string

      beforeEach(() => {
        const [privateKey, publicKey] = generator()

        privateKeyObject = createPrivateKey({
          key: privateKey,
          format: 'pem', // Input format is PEM
        })

        publicKeyObject = createPublicKey(privateKeyObject)

        // Export original private/public keys back to PEM for comparison
        originalPemPrivKey = privateKeyObject.export({ type: 'pkcs8', format: 'pem' }) as string
        originalPemPubKey = publicKeyObject.export({ type: 'spki', format: 'pem' }) as string
      })

      test('without any password', () => {
        // Convert the privateKeyObject back to PEM ensure consistent serialization
        // And then convert it back to a private key object
        const privateKeyFromPem = pemToPrivateKey(keyToPem(privateKeyObject))

        // Export derived key back to PEM for comparison
        const derivedPemPrivKey = privateKeyFromPem.export({
          type: 'pkcs8',
          format: 'pem',
        }) as string

        expect(derivedPemPrivKey).toStrictEqual(originalPemPrivKey)

        // Convert the publicKeyObject back to PEM ensure consistent serialization
        // And then convert it back to a public key object
        const publicKeyFromPem = pemToPublicKey(keyToPem(publicKeyObject))

        // Export derived key back to PEM for comparison
        const derivedPemPubKey = publicKeyFromPem.export({
          type: 'spki',
          format: 'pem',
        }) as string

        expect(derivedPemPubKey).toStrictEqual(originalPemPubKey)
      })

      test('with password in 1/2 function', () => {
        // Convert the privateKeyObject back to PEM ensure consistent serialization
        // And then convert it back to a private key object with password
        const privateKeyFromPemPassword = pemToPrivateKey(keyToPem(privateKeyObject), 'subspace')

        // Export both original and derived keys back to PEM and compare those
        const derivedPemPasswordPrivKey = privateKeyFromPemPassword.export({
          type: 'pkcs8',
          format: 'pem',
        }) as string

        expect(derivedPemPasswordPrivKey).toStrictEqual(originalPemPrivKey)
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

        expect(derivedPemPassword).toStrictEqual(originalPemPrivKey)
      })
    })
  }
})

describe('Private/Public key to hex for', () => {
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
    const publicKeyObject = createPublicKey(privateKeyObject)

    expect(keyToHex(privateKeyObject)).toStrictEqual(expect.any(String))
    expect(keyToHex(publicKeyObject)).toStrictEqual(expect.any(String))
  })
})

describe('Do public keys match for', () => {
  const keyTypes = [
    { label: 'RSA', keyGenerator: generateRsaKeyPair },
    { label: 'Ed25519', keyGenerator: generateEd25519KeyPair },
  ]

  keyTypes.forEach(({ label, keyGenerator }) => {
    describe(`${label}`, () => {
      let privateKeyPem1: string,
        publicKeyPem1: string,
        publicKeyPem2: string,
        privateKeyPem3: string,
        publicKeyPem3: string
      let publicKey1: KeyObject, publicKey2: KeyObject, publicKey3: KeyObject

      beforeEach(() => {
        ;[privateKeyPem1, publicKeyPem1] = keyGenerator()
        publicKeyPem2 = publicKeyPem1 // The same key to ensure a match
        ;[privateKeyPem3, publicKeyPem3] = keyGenerator()

        publicKey1 = createPublicKey({ key: publicKeyPem1, format: 'pem' })
        publicKey2 = createPublicKey({ key: publicKeyPem2, format: 'pem' })
        publicKey3 = createPublicKey({ key: publicKeyPem3, format: 'pem' })
      })

      test('should return true if two public keys match', () => {
        const match = doPublicKeysMatch(publicKey1, publicKey2)
        expect(match).toBe(true)
      })

      test('should return false if two public keys do not match', () => {
        const noMatch = doPublicKeysMatch(publicKey1, publicKey3)
        expect(noMatch).toBe(false)
      })

      test('should handle comparison of the same key object', () => {
        const selfMatch = doPublicKeysMatch(publicKey1, publicKey1)
        expect(selfMatch).toBe(true)
      })
    })
  })
})
