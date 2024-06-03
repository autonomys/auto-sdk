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

describe('PEM to Private/Public key for RSA', () => {
  let privateKeyObject: KeyObject
  let originalPem: string

  beforeEach(() => {
    const [privateKey, publicKey] = generateRsaKeyPair()
    expect(privateKey).toStrictEqual(expect.any(String))
    expect(publicKey).toStrictEqual(expect.any(String))

    privateKeyObject = createPrivateKey({
      key: privateKey,
      format: 'pem', // Input can still be PEM
    })

    const publicKeyObject = createPublicKey(privateKeyObject)
    // Export both original and derived keys back to PEM and compare those
    originalPem = privateKeyObject.export({ type: 'pkcs8', format: 'pem' }) as string
  })

  test('without any password', () => {
    // Convert the privateKeyObject back to PEM ensure consistent serialization
    // And then convert it back to a private key object
    const privateKeyFromPem = pemToPrivateKey(keyToPem(privateKeyObject))

    const derivedPem = privateKeyFromPem.export({ type: 'pkcs8', format: 'pem' }) as string

    expect(derivedPem).toStrictEqual(originalPem)
  })

  test('with password in 1/2 function', () => {
    // Convert the privateKeyObject back to PEM ensure consistent serialization
    // And then convert it back to a private key object with password
    const privateKeyFromPemPassword1 = pemToPrivateKey(keyToPem(privateKeyObject), 'subspace')

    // Export both original and derived keys back to PEM and compare those
    const derivedPemPassword = privateKeyFromPemPassword1.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string

    expect(derivedPemPassword).toStrictEqual(originalPem)
  })

  test('with password in 2/2 functions', () => {
    // Convert the privateKeyObject back to PEM with password ensure consistent serialization
    // And then convert it back to a private key object with password
    const privateKeyFromPemPassword2 = pemToPrivateKey(
      keyToPem(privateKeyObject, 'subspace'),
      'subspace',
    )

    // Export both original and derived keys back to PEM and compare those
    const derivedPemPassword = privateKeyFromPemPassword2.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string

    expect(derivedPemPassword).toStrictEqual(originalPem)
  })
})
