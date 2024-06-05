import { expect, test } from '@jest/globals'
import { KeyObject, createPrivateKey, createPublicKey } from 'crypto'
import { promises as fs } from 'fs'
import * as path from 'path'
import {
  doPublicKeysMatch,
  generateEd25519KeyPair,
  generateRsaKeyPair,
  keyToHex,
  keyToPem,
  loadPrivateKey,
  loadPublicKey,
  pemToPrivateKey,
  pemToPublicKey,
  saveKey,
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

describe('saveKey function', () => {
  const keyGenerators = [
    { name: 'RSA', generator: generateRsaKeyPair },
    { name: 'Ed25519', generator: generateEd25519KeyPair },
  ]

  for (const { name, generator } of keyGenerators) {
    describe(`${name}`, () => {
      // Directory for test output
      const testDir = path.join(__dirname, 'test_keys')
      let privateKey: string

      // Create a directory for test outputs before any tests run
      beforeAll(async () => {
        await fs.mkdir(testDir, { recursive: true })
      })

      beforeEach(() => {
        ;[privateKey] = generator()
      })

      // Cleanup: remove test directory after all tests
      afterAll(async () => {
        await fs.rm(testDir, { recursive: true, force: true })
      })

      test('should save a private key to a file', async () => {
        const filePath = path.join(testDir, 'testPrivateKey.pem')

        const privateKeyObject = pemToPrivateKey(privateKey)

        await saveKey(privateKeyObject, filePath)
        const fileContents = await fs.readFile(filePath, { encoding: 'utf8' })

        // Check if the PEM string matches expected, considering JSON.stringify use
        expect(fileContents).toBe(JSON.stringify(keyToPem(privateKeyObject)));
      })

      test('should save an encrypted private key to a file', async () => {
        const filePath = path.join(testDir, 'testEncryptedPrivateKey.pem')
        const password = 'testpassword'

        await saveKey(pemToPrivateKey(privateKey), filePath, password)
        const fileContents = await fs.readFile(filePath, { encoding: 'utf8' })

        // Parse it back to normal string
        const actualPemContent = JSON.parse(fileContents);

        // Check if the file content starts and ends with the expected encrypted private key headers
        expect(actualPemContent.startsWith('-----BEGIN ENCRYPTED PRIVATE KEY-----')).toBe(true)
        expect(actualPemContent.endsWith('-----END ENCRYPTED PRIVATE KEY-----\n')).toBe(true)
      })
      test('should throw an error when trying to save to an invalid path', async () => {
        const filePath = path.join(testDir, 'non_existent_directory', 'testPrivateKey.pem')

        await expect(saveKey(pemToPrivateKey(privateKey), filePath)).rejects.toThrow()
      })
    })
  }
})

describe('Key loading functions', () => {
  const keyGenerators = [
    { name: 'RSA', generator: generateRsaKeyPair },
    { name: 'Ed25519', generator: generateEd25519KeyPair },
  ]

  for (const { name, generator } of keyGenerators) {
    describe(`${name}`, () => {
      const testDir = path.join(__dirname, 'test_keys')

      // Directory setup for test keys
      beforeAll(async () => {
        await fs.mkdir(testDir, { recursive: true })
      })

      afterAll(async () => {
        await fs.rm(testDir, { recursive: true, force: true })
      })

      // Load Private Key Tests
      describe('loadPrivateKey', () => {
        const [privateKey] = generator()
        const filePath = path.join(testDir, 'testPrivateKey.pem')
        const password = 'testpassword'

        beforeAll(async () => {
          // Saving a regular and an encrypted private key for tests
          await saveKey(pemToPrivateKey(privateKey), filePath)
          await saveKey(pemToPrivateKey(privateKey), `${filePath}.enc`, password)
        })

        test('should load a private key from a file', async () => {
          const loadedPrivateKey = await loadPrivateKey(filePath)
          expect(loadedPrivateKey.export({ type: 'pkcs8', format: 'pem' })).toBe(privateKey)
        })

        test('should load an encrypted private key from a file using a password', async () => {
          const loadedPrivateKey = await loadPrivateKey(`${filePath}.enc`, password)
          expect(loadedPrivateKey.export({ type: 'pkcs8', format: 'pem' })).toBe(privateKey)
        })

        test('should throw an error when the password for encrypted key is wrong', async () => {
          await expect(loadPrivateKey(`${filePath}.enc`, 'wrongpassword')).rejects.toThrow()
        })
      })

      // Load Public Key Tests
      describe('loadPublicKey', () => {
        const [_, publicKey] = generator()
        const filePath = path.join(testDir, 'testPublicKey.pem')

        beforeAll(async () => {
          // Saving a public key for test
          await saveKey(pemToPublicKey(publicKey), filePath)
        })

        test('should load a public key from a file', async () => {
          const loadedPublicKey = await loadPublicKey(filePath)
          expect(loadedPublicKey.export({ type: 'spki', format: 'pem' })).toBe(publicKey)
        })

        test('should throw an error when file does not exist', async () => {
          await expect(
            loadPublicKey(path.join(testDir, 'nonexistentPublicKey.pem')),
          ).rejects.toThrow()
        })
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
