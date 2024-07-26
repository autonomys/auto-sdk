import { expect, test } from '@jest/globals'
import { promises as fs } from 'fs'
import * as path from 'path'
import {
  cryptoKeyToPem,
  decryptPem,
  doPublicKeysMatch,
  generateEd25519KeyPair,
  generateRsaKeyPair,
  keyToHex,
  loadPrivateKey,
  loadPublicKey,
  pemToPrivateKey,
  pemToPublicKey,
  saveKey,
} from '../src/keyManagement'

describe('Generate keypair for', () => {
  test('RSA', async () => {
    const { privateKey, publicKey } = await generateRsaKeyPair()
    const privateKeyString = await cryptoKeyToPem(privateKey)
    const publicKeyString = await cryptoKeyToPem(publicKey)
    expect(privateKeyString).toStrictEqual(expect.any(String))
    expect(publicKeyString).toStrictEqual(expect.any(String))
  })

  test('Ed25519', async () => {
    const { privateKey, publicKey } = await generateEd25519KeyPair()
    const privateKeyString = await cryptoKeyToPem(privateKey)
    const publicKeyString = await cryptoKeyToPem(publicKey)
    expect(privateKeyString).toStrictEqual(expect.any(String))
    expect(publicKeyString).toStrictEqual(expect.any(String))
  })
})

describe('Private/Public key to PEM with/without password for', () => {
  test('RSA without password', async () => {
    const { privateKey, publicKey } = await generateRsaKeyPair()
    const privateKeyPem = await cryptoKeyToPem(privateKey)
    const publicKeyPem = await cryptoKeyToPem(publicKey)
    expect(privateKeyPem).toMatch(/-----BEGIN PRIVATE KEY-----/)
    expect(publicKeyPem).toMatch(/-----BEGIN PUBLIC KEY-----/)
  })

  test('RSA with password', async () => {
    const { privateKey } = await generateRsaKeyPair()
    const privateKeyPem = await cryptoKeyToPem(privateKey, 'testpassword')
    expect(privateKeyPem).toMatch(/-----BEGIN ENCRYPTED PRIVATE KEY-----/)
  })

  test('Ed25519 without password', async () => {
    const { privateKey, publicKey } = await generateEd25519KeyPair()
    const privateKeyPem = await cryptoKeyToPem(privateKey)
    const publicKeyPem = await cryptoKeyToPem(publicKey)
    expect(privateKeyPem).toMatch(/-----BEGIN PRIVATE KEY-----/)
    expect(publicKeyPem).toMatch(/-----BEGIN PUBLIC KEY-----/)
  })

  test('Ed25519 with password', async () => {
    const { privateKey } = await generateEd25519KeyPair()
    const privateKeyPem = await cryptoKeyToPem(privateKey, 'testpassword')
    expect(privateKeyPem).toMatch(/-----BEGIN ENCRYPTED PRIVATE KEY-----/)
  })
})

describe('PEM to Private/Public key for', () => {
  const keyGenerators = [
    {
      name: 'RSA',
      generator: generateRsaKeyPair,
      algorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    },
    { name: 'Ed25519', generator: generateEd25519KeyPair, algorithm: { name: 'Ed25519' } },
  ]

  for (const { name, generator, algorithm } of keyGenerators) {
    describe(`${name}`, () => {
      let privateKeyObject: CryptoKey, publicKeyObject: CryptoKey
      let originalPemPrivKey: string, originalPemPubKey: string

      beforeEach(async () => {
        const { privateKey, publicKey } = await generator()
        privateKeyObject = await pemToPrivateKey(await cryptoKeyToPem(privateKey), algorithm)
        publicKeyObject = await pemToPublicKey(await cryptoKeyToPem(publicKey), algorithm)

        originalPemPrivKey = await cryptoKeyToPem(privateKeyObject)
        originalPemPubKey = await cryptoKeyToPem(publicKeyObject)
      })

      test('without any password', async () => {
        const privateKeyFromPem = await pemToPrivateKey(originalPemPrivKey, algorithm)
        const derivedPemPrivKey = await cryptoKeyToPem(privateKeyFromPem)
        expect(derivedPemPrivKey).toStrictEqual(originalPemPrivKey)

        const publicKeyFromPem = await pemToPublicKey(originalPemPubKey, algorithm)
        const derivedPemPubKey = await cryptoKeyToPem(publicKeyFromPem)
        expect(derivedPemPubKey).toStrictEqual(originalPemPubKey)
      })

      test('with password in 1/2 function', async () => {
        const privateKeyFromPemPassword = await pemToPrivateKey(
          originalPemPrivKey,
          algorithm,
          'subspace',
        )
        const derivedPemPasswordPrivKey = await cryptoKeyToPem(privateKeyFromPemPassword)
        expect(derivedPemPasswordPrivKey).toStrictEqual(originalPemPrivKey)
      })

      test('with password in 2/2 functions', async () => {
        const privateKeyFromPemPassword = await pemToPrivateKey(
          await cryptoKeyToPem(privateKeyObject, 'subspace'),
          algorithm,
          'subspace',
        )
        const derivedPemPassword = await cryptoKeyToPem(privateKeyFromPemPassword)
        expect(derivedPemPassword).toStrictEqual(originalPemPrivKey)
      })
    })
  }
})

describe('Save Key', () => {
  const keyGenerators = [
    {
      name: 'RSA',
      generator: generateRsaKeyPair,
    },
    { name: 'Ed25519', generator: generateEd25519KeyPair },
  ]

  for (const { name, generator } of keyGenerators) {
    describe(`${name}`, () => {
      const testDir = path.join(__dirname, 'test_keys')
      let keyPair: CryptoKeyPair

      beforeAll(async () => {
        await fs.mkdir(testDir, { recursive: true })
      })

      beforeEach(async () => {
        keyPair = await generator()
      })

      afterAll(async () => {
        await fs.rm(testDir, { recursive: true, force: true })
      })

      test('should save a private key to a file', async () => {
        const filePath = path.join(testDir, 'testPrivateKey.pem')
        const { privateKey } = keyPair
        await saveKey(privateKey, filePath)
        const fileContents = (await fs.readFile(filePath, { encoding: 'utf8' }))
          .replace(/\\n/g, '\n')
          .replace(/"/g, '')
        const privateKeyPem = await cryptoKeyToPem(privateKey)

        expect(fileContents).toBe(privateKeyPem)
      })

      test('should save an encrypted private key to a file and decrypt correctly', async () => {
        const filePath = path.join(testDir, 'testEncryptedPrivateKey.pem')
        const password = 'testpassword'
        const { privateKey } = keyPair
        await saveKey(privateKey, filePath, password)
        const fileContents = (await fs.readFile(filePath, { encoding: 'utf8' }))
          .replace(/\\n/g, '\n')
          .replace(/"/g, '')
          .trim()

        // Decrypt the PEM read from file
        const decryptedKey = await decryptPem(fileContents, password)

        // Get the original private key in PEM format (unencrypted for comparison)
        const originalPrivateKeyPem = await cryptoKeyToPem(privateKey)

        // Compare the decrypted key with the original
        expect(decryptedKey.trim()).toBe(originalPrivateKeyPem.trim())
      })

      test('should throw an error when trying to save to an invalid path', async () => {
        const filePath = path.join(testDir, 'non_existent_directory', 'testPrivateKey.pem')
        const { privateKey } = keyPair
        await expect(saveKey(privateKey, filePath)).rejects.toThrow()
      })
    })
  }
})

describe('Load Key', () => {
  const keyGenerators = [
    {
      name: 'RSA',
      generator: generateRsaKeyPair,
      algorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    },
    { name: 'Ed25519', generator: generateEd25519KeyPair, algorithm: { name: 'Ed25519' } },
  ]

  for (const { name, generator, algorithm } of keyGenerators) {
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
        let keyPair: CryptoKeyPair
        const filePath = path.join(testDir, 'testPrivateKey.pem')
        const password = 'testpassword'

        beforeAll(async () => {
          // Generate key pair and save private key
          keyPair = await generator()
          await saveKey(keyPair.privateKey, filePath)
          await saveKey(keyPair.privateKey, `${filePath}.enc`, password)
        })

        test('should load a private key from a file', async () => {
          const loadedPrivateKey = await loadPrivateKey(filePath, algorithm)
          const originalPem = await cryptoKeyToPem(keyPair.privateKey)
          const loadedPem = await cryptoKeyToPem(loadedPrivateKey)
          expect(loadedPem).toBe(originalPem)
        })

        test('should load an encrypted private key from a file using a password', async () => {
          const loadedPrivateKey = await loadPrivateKey(`${filePath}.enc`, algorithm, password)
          const originalPem = await cryptoKeyToPem(keyPair.privateKey)
          const loadedPem = await cryptoKeyToPem(loadedPrivateKey)
          expect(loadedPem).toBe(originalPem)
        })

        test('should throw an error when the password for encrypted key is wrong', async () => {
          await expect(
            loadPrivateKey(`${filePath}.enc`, algorithm, 'wrongpassword'),
          ).rejects.toThrow()
        })
      })

      // Load Public Key Tests
      describe('loadPublicKey', () => {
        let publicKey: CryptoKey
        const filePath = path.join(testDir, 'testPublicKey.pem')

        beforeAll(async () => {
          // Generate key pair and save public key
          const keyPair = await generator()
          publicKey = keyPair.publicKey
          await saveKey(publicKey, filePath)
        })

        test('should load a public key from a file', async () => {
          const loadedPublicKey = await loadPublicKey(filePath, algorithm)
          const originalPem = await cryptoKeyToPem(publicKey)
          const loadedPem = await cryptoKeyToPem(loadedPublicKey)
          expect(loadedPem).toBe(originalPem)
        })

        test('should throw an error when file does not exist', async () => {
          await expect(
            loadPublicKey(path.join(testDir, 'nonexistentPublicKey.pem'), algorithm),
          ).rejects.toThrow()
        })
      })
    })
  }
})
describe('Private/Public key to hex for', () => {
  let privateKey: CryptoKey, publicKey: CryptoKey

  test('RSA', async () => {
    const keyPair = await generateRsaKeyPair()
    privateKey = keyPair.privateKey
    publicKey = keyPair.publicKey
  })

  test('Ed25519', async () => {
    const keypair = await generateEd25519KeyPair()
  })

  afterEach(async () => {
    expect(await keyToHex(privateKey)).toStrictEqual(expect.any(String))
    expect(await keyToHex(publicKey)).toStrictEqual(expect.any(String))
  })
})

describe('Do public keys match for', () => {
  const keyTypes = [
    {
      label: 'RSA',
      keyGenerator: generateRsaKeyPair,
      algorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    },
    { label: 'Ed25519', keyGenerator: generateEd25519KeyPair, algorithm: { name: 'Ed25519' } },
  ]

  keyTypes.forEach(({ label, keyGenerator, algorithm }) => {
    describe(`${label}`, () => {
      let publicKey1: CryptoKey, publicKey2: CryptoKey, publicKey3: CryptoKey

      beforeEach(async () => {
        const { publicKey: publicKeyPem1 } = await keyGenerator()
        publicKey1 = await pemToPublicKey(await cryptoKeyToPem(publicKeyPem1), algorithm)
        publicKey2 = publicKey1 // The same key to ensure a match
        const { publicKey: publicKeyPem3 } = await keyGenerator()
        publicKey3 = await pemToPublicKey(await cryptoKeyToPem(publicKeyPem3), algorithm)
      })

      test('should return true if two public keys match', async () => {
        const match = await doPublicKeysMatch(publicKey1, publicKey2)
        expect(match).toBe(true)
      })

      test('should return false if two public keys do not match', async () => {
        const noMatch = await doPublicKeysMatch(publicKey1, publicKey3)
        expect(noMatch).toBe(false)
      })

      test('should handle comparison of the same key object', async () => {
        const selfMatch = await doPublicKeysMatch(publicKey1, publicKey1)
        expect(selfMatch).toBe(true)
      })
    })
  })
})
