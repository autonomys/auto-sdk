import { asn1, pki, pkcs7, util } from 'node-forge'
import { cryptoKeyToPem, generateRsaKeyPair, pemToASN1, pemToPublicKey } from './src/keyManagement'

function normalizePem(pem: string) {
  // Normalize line endings to Unix style and trim whitespace
  return pem.replace(/\r\n/g, '\n').trim()
}

function identityTest() {
  const privateKey = pki.rsa.generateKeyPair(2048).privateKey

  /// Private key to PEM
  const originalPem = pki.privateKeyToPem(privateKey)

  // Asn1 formatted private key
  const privateKeyInfo = pki.privateKeyFromPem(originalPem)

  // Private key info to PEM
  const decryptedPem = pki.privateKeyToPem(privateKeyInfo)

  return decryptedPem
}

async function forgeTest() {
  const pem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtezEu8NgmZPhQ8mwHjED
bjIjc9gtUp+E4Cx918nr7xl5R0tNXmCtnRLiEecFOi+3jjDMhahTG/Qhp/Rq2oj8
Er67XnSI4fYUymfY2L38HXPk8l4Yq4Di3eMtxRJnrgk/dsqWM9eFmejYyls2kOWc
rtTmeZK/250nbwadcKTCh1vvSSm206OowWXEVVWq/PtflrQ5M2zjFxYuLaxG0Dly
W62tWBgo/RxKTbwWiIdFChqWXg2+LNdoj8Zy3ab9Sb7Pu1Gb9VH0x2KLKjpzuuyD
Qv3U4vdgmAcz9nAUH3LNp6zaRZdDVb1oUraJIisr617iI/49W99np/xTU8/OHc+A
OQIDAQAB
-----END PUBLIC KEY-----
`

  const publicKey = await pemToPublicKey(pem, {
    name: 'RSASSA-PKCS1-v1_5',
    hash: 'SHA-256',
  })

  const derivedPem = await cryptoKeyToPem(publicKey)

  console.log(pem === derivedPem)

  console.error(pem, derivedPem)
}

forgeTest()
