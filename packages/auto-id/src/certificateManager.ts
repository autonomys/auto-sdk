//! For key generation, management, `keyManagement.ts` file is used using "crypto" library.
//! And for certificate related, used "@peculiar/x509" library.

import { blake2b_256, concatenateUint8Arrays, stringToUint8Array } from '@autonomys/auto-utils'
import { AsnConvert } from '@peculiar/asn1-schema'
import { AttributeTypeAndValue } from '@peculiar/asn1-x509'
import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import { KeyObject, createPublicKey } from 'crypto'
import fs from 'fs'
import { doPublicKeysMatch } from './keyManagement'
import { randomSerialNumber } from './utils'

const crypto = new Crypto()
x509.cryptoProvider.set(crypto)

interface SigningParams {
  privateKey: KeyObject
  algorithm: 'sha256' | null // Only 'sha256' or null for Ed25519
}

const OID_COMMON_NAME = '2.5.4.3' // OID for Common Name, not available in the library.
const OID_SUBJECT_ALT_NAME = '2.5.29.17' // OID for Subject Alternative Name, not available in the library.

export class CertificateManager {
  private certificate: x509.X509Certificate | null
  private privateKey: KeyObject | null
  private publicKey: KeyObject | null

  constructor(
    certificate: x509.X509Certificate | null = null,
    privateKey: KeyObject | null = null,
    publicKey: KeyObject | null = null,
  ) {
    this.certificate = certificate
    this.privateKey = privateKey
    this.publicKey = publicKey
  }

  protected prepareSigningParams(): SigningParams {
    const privateKey = this.privateKey

    if (!privateKey) {
      throw new Error('Private key is not set.')
    }

    if (privateKey.asymmetricKeyType === 'ed25519') {
      return { privateKey: privateKey, algorithm: null }
    }

    if (privateKey.asymmetricKeyType === 'rsa') {
      return { privateKey: privateKey, algorithm: 'sha256' }
    }

    throw new Error('Unsupported key type for signing.')
  }

  protected static toCommonName(subjectName: string): x509.Name {
    const commonNameAttr = new AttributeTypeAndValue({
      type: OID_COMMON_NAME,
      value: subjectName,
    })
    return new x509.Name([[commonNameAttr]])
  }

  // protected static toCommonName(subjectName: string): JsonName {
  //   return [{ '2.5.4.3': [subjectName] }] // OID for commonName
  // }

  private static async keyObjectToCryptoKey(keyObject: KeyObject): Promise<CryptoKey> {
    const keyType = keyObject.type
    const keyPem = keyObject
      .export({ type: keyType === 'private' ? 'pkcs8' : 'spki', format: 'pem' })
      .toString()
    const keyData = Buffer.from(keyPem.split('\n').slice(1, -1).join(''), 'base64')

    if (keyObject.asymmetricKeyType === 'ed25519') {
      if (keyType === 'private') {
        return crypto.subtle.importKey('pkcs8', keyData, { name: 'Ed25519' }, true, ['sign'])
      } else {
        return crypto.subtle.importKey('spki', keyData, { name: 'Ed25519' }, true, ['verify'])
      }
    } else if (keyObject.asymmetricKeyType === 'rsa') {
      if (keyType === 'private') {
        return crypto.subtle.importKey(
          'pkcs8',
          keyData,
          {
            name: 'RSASSA-PKCS1-v1_5',
            hash: { name: 'SHA-256' },
          },
          true,
          ['sign'],
        )
      } else {
        return crypto.subtle.importKey(
          'spki',
          keyData,
          {
            name: 'RSASSA-PKCS1-v1_5',
            hash: { name: 'SHA-256' },
          },
          true,
          ['verify'],
        )
      }
    } else {
      throw new Error('Unsupported key type')
    }
  }

  static prettyPrintCertificate(cert: x509.X509Certificate): void {
    console.log('Certificate:')
    console.log('============')
    console.log(`Subject: ${cert.subject}`)
    console.log(`Issuer: ${cert.issuer}`)
    console.log(`Serial Number: ${cert.serialNumber}`)
    console.log(`Not Valid Before: ${cert.notBefore}`)
    console.log(`Not Valid After: ${cert.notAfter}`)

    console.log('\nExtensions:')
    cert.extensions.forEach((ext) => {
      console.log(` - ${ext.type}: ${JSON.stringify(ext.value)}`)
    })
    console.log('\nPublic Key:')
    console.log(cert.publicKey)
  }

  static certificateToPem(cert: x509.X509Certificate): string {
    return cert.toString('pem')
  }

  static pemToCertificate(pem: string): x509.X509Certificate {
    return new x509.X509Certificate(pem)
  }

  static getSubjectCommonName(subject: x509.Name): string | undefined {
    const commonNames = subject.getField(OID_COMMON_NAME) // OID for commonName
    return commonNames.length > 0 ? commonNames[0] : undefined
  }

  // static async pemPublicFromPrivateKey(privateKey: CryptoKey): Promise<string> {
  //   const publicKey = await crypto.subtle.exportKey('spki', privateKey)
  //   return x509.PemConverter.encode(publicKey, 'PUBLIC KEY')
  // }

  // static async derPublicFromPrivateKey(privateKey: CryptoKey): Promise<string> {
  //   const publicKey = await crypto.subtle.exportKey('spki', privateKey)
  //   return Buffer.from(publicKey).toString('hex')
  // }

  static getCertificateAutoId(certificate: x509.X509Certificate): string | undefined {
    const sanExtension = certificate.extensions.find((ext) => ext.type === OID_SUBJECT_ALT_NAME) // OID for subjectAltName
    if (sanExtension && sanExtension.value) {
      const san = sanExtension.value as any // Adjust this cast as needed based on actual SAN structure
      for (const name of san.altNames) {
        if (name.type === 6 && name.value.startsWith('autoid:auto:')) {
          return name.value.split(':').pop()
        }
      }
    }
    return undefined
  }

  async createCSR(subjectName: string): Promise<x509.Pkcs10CertificateRequest> {
    const privateKey = this.privateKey
    const publicKey = this.publicKey

    if (!privateKey || !publicKey) {
      throw new Error('Private or public key is not set.')
    }

    // Set the signing algorithm based on the key type
    let signingAlgorithm: Algorithm | EcdsaParams
    if (privateKey.asymmetricKeyType === 'ed25519') {
      signingAlgorithm = { name: 'Ed25519' }
    } else if (privateKey.asymmetricKeyType === 'rsa') {
      signingAlgorithm = { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } }
    } else {
      throw new Error('Unsupported key type for signing')
    }

    const csr = await x509.Pkcs10CertificateRequestGenerator.create({
      name: `CN=${subjectName}`,
      keys: {
        privateKey: await CertificateManager.keyObjectToCryptoKey(privateKey),
        publicKey: await CertificateManager.keyObjectToCryptoKey(publicKey),
      },
      signingAlgorithm: signingAlgorithm,
    })

    return csr
  }

  async signCSR(csr: x509.Pkcs10CertificateRequest): Promise<x509.Pkcs10CertificateRequest> {
    const privateKey = this.privateKey
    if (!privateKey) {
      throw new Error('Private key is not set.')
    }

    const privateKeyConverted = await CertificateManager.keyObjectToCryptoKey(privateKey)

    const _signingParams = this.prepareSigningParams()

    // FIXME: check during testing
    // const derBuffer = csr.rawData
    const asn1 = csr.rawData
    const derBuffer = AsnConvert.serialize(asn1)
    const signature = await crypto.subtle.sign(
      privateKeyConverted.algorithm.name,
      privateKeyConverted,
      derBuffer,
    )
    csr.signature = new Uint8Array(signature)

    return csr
  }

  async createAndSignCSR(subjectName: string): Promise<x509.Pkcs10CertificateRequest> {
    const csr = await this.createCSR(subjectName)
    return this.signCSR(csr)
  }

  // TODO: later on move to "keyManagement.ts"
  private static publicKeyToKeyObject(publicKey: x509.PublicKey): KeyObject {
    // Export the key data to ArrayBuffer
    const keyData = publicKey.rawData // DER format

    // Create a KeyObject from the key data
    const keyObject = createPublicKey({
      key: Buffer.from(keyData),
      format: 'der',
      type: 'spki',
    })

    return keyObject
  }

  // TODO: later on move to utils.
  private static stringToArrayBuffer(str: string): ArrayBuffer {
    const buffer = new ArrayBuffer(str.length)
    const view = new Uint8Array(buffer)
    for (let i = 0; i < str.length; i++) {
      view[i] = str.charCodeAt(i)
    }
    return buffer
  }

  async issueCertificate(
    csr: x509.Pkcs10CertificateRequest,
    validityPeriodDays: number = 365,
  ): Promise<x509.X509Certificate> {
    const privateKey = this.privateKey
    const publicKey = this.publicKey
    if (!privateKey || !publicKey) {
      throw new Error('Private or public key is not set.')
    }

    let issuerName: x509.Name
    let autoId: string
    const certificate = this.certificate
    if (!certificate) {
      issuerName = csr.subjectName
      const subjectCommonName = CertificateManager.getSubjectCommonName(issuerName)
      if (!subjectCommonName) {
        throw new Error('Subject common name not found in CSR.')
      }
      autoId = blake2b_256(stringToUint8Array(subjectCommonName))
    } else {
      if (
        !doPublicKeysMatch(
          CertificateManager.publicKeyToKeyObject(certificate.publicKey),
          publicKey,
        )
      ) {
        throw new Error(
          'Issuer certificate public key does not match the private key used for signing.',
        )
      }

      issuerName = certificate.subjectName
      const certificateAutoId = CertificateManager.getCertificateAutoId(certificate) || ''
      const certificateSubjectCommonName =
        CertificateManager.getSubjectCommonName(certificate.subjectName) || ''
      if (certificateAutoId === '' || certificateSubjectCommonName === '') {
        throw new Error(
          'Issuer certificate does not have either an auto ID or a subject common name or both.',
        )
      }
      autoId = blake2b_256(
        concatenateUint8Arrays(
          stringToUint8Array(certificateAutoId),
          stringToUint8Array(certificateSubjectCommonName),
        ),
      )
    }

    // Prepare the certificate builder with information from the CSR
    const notBefore = new Date()
    const notAfter = new Date()
    notAfter.setDate(notBefore.getDate() + validityPeriodDays)

    const privateKeyConverted = await CertificateManager.keyObjectToCryptoKey(privateKey)

    let certificateBuilder = await x509.X509CertificateGenerator.create({
      serialNumber: randomSerialNumber().toString(),
      issuer: csr.subject,
      subject: csr.subject,
      notBefore,
      notAfter,
      signingAlgorithm: privateKeyConverted.algorithm,
      publicKey: await CertificateManager.keyObjectToCryptoKey(publicKey),
      signingKey: privateKeyConverted,
    })

    const autoIdSan = `autoid:auto:${Buffer.from(autoId).toString('hex')}`

    // FIXME: check testing
    // Check for existing SAN extension
    // const sanExtensions = csr.extensions
    const sanExtensions = csr.extensions.filter((ext) => ext.type === OID_SUBJECT_ALT_NAME) // OID for subjectAltName
    if (sanExtensions) {
      // const existingSan = sanExtensions[0].value
      const existingSan = sanExtensions[0] as x509.SubjectAlternativeNameExtension
      const generalNames = existingSan.names.toJSON()

      // Add autoIdSan to generalNames
      generalNames.push({
        type: 'uniformResourceIdentifier' as x509.GeneralNameType,
        value: autoIdSan,
      })

      // const newSanExtension = existingSan + CertificateManager.stringToArrayBuffer(autoIdSan)
      const newSanExtension = new x509.SubjectAlternativeNameExtension(
        generalNames,
        existingSan.critical,
      )
      certificateBuilder.extensions.push(newSanExtension)
    } else {
      // certificateBuilder.extensions.push(
      //   new x509.SubjectAlternativeNameExtension([autoIdSan]),
      //   false,
      // )

      certificateBuilder.extensions.push(
        new x509.SubjectAlternativeNameExtension([
          { type: 'uniformResourceIdentifier' as x509.GeneralNameType, value: autoIdSan },
        ]),
      )
    }

    // Copy all extensions from the CSR to the certificate
    for (const ext of csr.extensions) {
      // certificateBuilder.extensions.push(new x509.Extension(ext.value, ext.critical))
      certificateBuilder.extensions.push(ext)
    }

    const certificateSigned = await x509.X509CertificateGenerator.create({
      serialNumber: certificateBuilder.serialNumber,
      issuer: certificateBuilder.issuer,
      subject: certificateBuilder.subject,
      notBefore: certificateBuilder.notBefore,
      notAfter: certificateBuilder.notAfter,
      extensions: certificateBuilder.extensions,
      publicKey: certificateBuilder.publicKey,
      signingAlgorithm: certificateBuilder.signatureAlgorithm,
      signingKey: privateKeyConverted,
    })

    return certificateSigned
  }

  async selfIssueCertificate(
    subjectName: string,
    validityPeriodDays: number = 365,
  ): Promise<x509.X509Certificate> {
    if (!this.privateKey || !this.publicKey) {
      throw new Error('Private or public key is not set.')
    }

    const csr = await this.createAndSignCSR(subjectName)
    const certificate = await this.issueCertificate(csr, validityPeriodDays)

    this.certificate = certificate
    return certificate
  }

  saveCertificate(filePath: string): void {
    if (!this.certificate) {
      throw new Error('No certificate available to save.')
    }

    const certificatePem = CertificateManager.certificateToPem(this.certificate)
    fs.writeFileSync(filePath, certificatePem, 'utf8')
  }
}

export class Ed25519CertificateManager {
  private certificate: x509.X509Certificate | null
  private privateKey: CryptoKey | null

  constructor(
    certificate: x509.X509Certificate | null = null,
    privateKey: CryptoKey | null = null,
  ) {
    this.certificate = certificate
    this.privateKey = privateKey
  }

  async createAndSignCSR(subjectName: string): Promise<x509.Pkcs10CertificateRequest> {
    if (!this.privateKey) {
      throw new Error('Private key is not set.')
    }

    // Export the public key (ArrayBuffer) from the private key
    const publicKeyArrayBuffer = await crypto.subtle.exportKey('spki', this.privateKey)
    // Create a public key (CryptoKey) from the exported public key
    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyArrayBuffer,
      {
        name: 'Ed25519',
      },
      true,
      ['verify'],
    )

    const csr = await x509.Pkcs10CertificateRequestGenerator.create({
      name: `CN=${subjectName}`,
      keys: { privateKey: this.privateKey, publicKey },
      signingAlgorithm: { name: 'Ed25519' },
    })

    return csr
  }

  async issueCertificate(
    csr: x509.Pkcs10CertificateRequest,
    validityPeriodDays: number = 365,
  ): Promise<x509.X509Certificate> {
    if (!this.privateKey) {
      throw new Error('Private key is not set.')
    }

    const notBefore = new Date()
    const notAfter = new Date()
    notAfter.setDate(notBefore.getDate() + validityPeriodDays)

    const certificate = await x509.X509CertificateGenerator.create({
      serialNumber: randomSerialNumber().toString(),
      issuer: csr.subject,
      subject: csr.subject,
      notBefore,
      notAfter,
      signingAlgorithm: { name: 'Ed25519' },
      signingKey: this.privateKey,
      publicKey: csr.publicKey,
    })

    this.certificate = certificate
    return certificate
  }

  async selfIssueCertificate(
    subjectName: string,
    validityPeriodDays: number = 365,
  ): Promise<x509.X509Certificate> {
    const csr = await this.createAndSignCSR(subjectName)
    return this.issueCertificate(csr, validityPeriodDays)
  }

  saveCertificate(filePath: string): void {
    if (!this.certificate) {
      throw new Error('No certificate available to save.')
    }
    const certificatePem = this.certificate.toString('pem')
    fs.writeFileSync(filePath, certificatePem, 'utf8')
  }
}
