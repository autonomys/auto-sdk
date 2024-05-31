import { expect, test } from '@jest/globals'
import { generateEd25519KeyPair, generateRsaKeyPair } from '../src/keyManagement'

test('generate RSA key pair', () => {
  const [privateKey, publicKey] = generateRsaKeyPair()
  expect(privateKey).toStrictEqual(expect.any(String))
  expect(publicKey).toStrictEqual(expect.any(String))
})

test('generate Ed25519 key pair', () => {
  const [privateKey, publicKey] = generateEd25519KeyPair()
  expect(privateKey).toStrictEqual(expect.any(String))
  expect(publicKey).toStrictEqual(expect.any(String))
})
