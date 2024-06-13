//! For key generation, management, `keyManagement.ts` file is used i.e. "crypto" library.
//! And for certificate related, used "node-forge" library.

import { blake2b_256, concatenateUint8Arrays, stringToUint8Array } from '@autonomys/auto-utils'
import { KeyObject, createPublicKey, createSign } from 'crypto'
import fs from 'fs'
import forge from 'node-forge'
import { doPublicKeysMatch, keyToPem, pemToPublicKey } from './keyManagement'
import { addDaysToCurrentDate, randomSerialNumber } from './utils'

interface CustomCertificateExtension {
  altNames: {
    type: number
    value: string
  }[]
}

interface SigningParams {
  privateKey: KeyObject
  algorithm: 'sha256' | null // Only 'sha256' or null for Ed25519
}

class CertificateManager {
  private certificate: forge.pki.Certificate | null
  private privateKey: KeyObject | null

  constructor(
    certificate: forge.pki.Certificate | null = null,
    privateKey: KeyObject | null = null,
  ) {
    this.certificate = certificate
    this.privateKey = privateKey
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

  static toCommonName(subjectName: string): forge.pki.CertificateField[] {
    return [{ name: 'commonName', value: subjectName }]
  }

  static prettyPrintCertificate(cert: forge.pki.Certificate): void {
    console.log('Certificate:')
    console.log('============')
    console.log(
      `Subject: ${cert.subject.attributes.map((attr) => `${attr.name}=${attr.value}`).join(', ')}`,
    )
    console.log(
      `Issuer: ${cert.issuer.attributes.map((attr) => `${attr.name}=${attr.value}`).join(', ')}`,
    )
    console.log(`Serial Number: ${cert.serialNumber}`)
    console.log(`Not Valid Before: ${cert.validity.notBefore.toISOString()}`)
    console.log(`Not Valid After: ${cert.validity.notAfter.toISOString()}`)
    console.log('\nExtensions:')
    cert.extensions.forEach((ext) => {
      console.log(` - ${ext.name} (${ext.id}): ${JSON.stringify(ext.value)}`)
    })
    console.log('\nPublic Key:')
    console.log(cert.publicKey)
  }

  static certificateToPem(cert: forge.pki.Certificate): string {
    return forge.pki.certificateToPem(cert)
  }

  static pemToCertificate(pem: string): forge.pki.Certificate {
    return forge.pki.certificateFromPem(pem)
  }

  static getSubjectCommonName(subjectFields: forge.pki.CertificateField[]): string | undefined {
    const cnField = subjectFields.find((field) => field.name === 'commonName')
    if (cnField && typeof cnField.value === 'string') {
      return cnField.value
    }
    return undefined
  }

  static getCertificateAutoId(certificate: forge.pki.Certificate): string | undefined {
    const sanExtension = certificate.getExtension('subjectAltName')
    if (sanExtension) {
      const san = sanExtension as CustomCertificateExtension
      for (const name of san.altNames) {
        if (name.type === 6 && name.value.startsWith('autoid:auto:')) {
          return name.value.split(':').pop()
        }
      }
    }
    return undefined
  }

  static pemPublicFromPrivateKey(privateKey: KeyObject): string {
    const publicKey = createPublicKey(privateKey)
    return publicKey.export({ type: 'spki', format: 'pem' }).toString()
  }

  static derPublicFromPrivateKey(privateKey: KeyObject): string {
    const publicKey = createPublicKey(privateKey)
    return publicKey.export({ type: 'spki', format: 'der' }).toString()
  }

  createCSR(subjectName: string): forge.pki.CertificateSigningRequest {
    const privateKey = this.privateKey
    if (!privateKey) {
      throw new Error('Private key is not set.')
    }
    let csr = forge.pki.createCertificationRequest()
    csr.setSubject(CertificateManager.toCommonName(subjectName))

    if (privateKey.asymmetricKeyType === 'ed25519') {
      // Manually handle Ed25519 due to possible forge limitations
      const publicKeyDer = CertificateManager.derPublicFromPrivateKey(privateKey)

      // Directly assign the public key in DER format
      csr.publicKey = forge.pki.publicKeyFromAsn1(forge.asn1.fromDer(publicKeyDer))
      // csr.publicKey = forge.pki.publicKeyFromPem(
      //   CertificateManager.pemPublicFromPrivateKey(privateKey),
      // )
    } else {
      csr.publicKey = forge.pki.publicKeyFromPem(
        CertificateManager.pemPublicFromPrivateKey(privateKey),
      )
    }
    return csr
  }

  signCSR(csr: forge.pki.CertificateSigningRequest): forge.pki.CertificateSigningRequest {
    const signingParams = this.prepareSigningParams()
    if (this.privateKey?.asymmetricKeyType === 'ed25519') {
      // Ensure cryptographic algorithm is set to sign
      // if (!csr.siginfo.algorithmOid) {
      //   throw new Error('Signature algorithm OID must be set before signing the CSR.')
      // }

      // console.log('Inspecting CSR before converting to ASN.1:', csr)
      const asn1 = forge.pki.certificationRequestToAsn1(csr)
      const derBuffer = forge.asn1.toDer(asn1).getBytes()

      const sign = createSign('SHA256')
      sign.update(derBuffer, 'binary') // Make sure the update is called with 'binary' encoding
      sign.end()

      const signature = sign.sign(signingParams.privateKey, 'binary')
      csr.signature = Buffer.from(signature, 'binary')
    } else {
      if (signingParams.algorithm) {
        const digestMethod = forge.md[signingParams.algorithm].create()
        csr.sign(forge.pki.privateKeyFromPem(keyToPem(signingParams.privateKey)), digestMethod)
      } else {
        throw new Error('Unsupported key type or missing algorithm.')
      }
    }

    return csr
  }

  createAndSignCSR(subject_name: string): forge.pki.CertificateSigningRequest {
    const csr = this.createCSR(subject_name)
    return this.signCSR(csr)
  }

  issueCertificate(
    csr: forge.pki.CertificateSigningRequest,
    validityPeriodDays: number = 365,
  ): forge.pki.Certificate {
    const privateKey = this.privateKey
    const certificate = this.certificate
    if (!privateKey) {
      throw new Error('Private key is not set.')
    }

    let issuerName: any
    let autoId: string
    if (!certificate) {
      issuerName = csr.subject.attributes
      autoId = blake2b_256(
        stringToUint8Array(CertificateManager.getSubjectCommonName(csr.subject.attributes) || ''),
      )
    } else {
      if (
        !doPublicKeysMatch(
          createPublicKey(forge.pki.publicKeyToPem(certificate.publicKey)),
          pemToPublicKey(CertificateManager.pemPublicFromPrivateKey(privateKey)),
        )
      ) {
        throw new Error(
          'Issuer certificate public key does not match the private key used for signing.',
        )
      }

      issuerName = certificate.subject.attributes
      const certificateAutoId = CertificateManager.getCertificateAutoId(certificate) || ''
      const certificateSubjectCommonName =
        CertificateManager.getSubjectCommonName(certificate.subject.attributes) || ''
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
    const cert = forge.pki.createCertificate()
    if (!csr.publicKey)
      throw new Error('CSR does not have a public key. Please provide a CSR with a public key.')
    cert.setSubject(csr.subject.attributes)
    cert.setIssuer(issuerName)
    cert.publicKey = csr.publicKey
    cert.serialNumber = randomSerialNumber().toString()
    cert.validity.notBefore = new Date()
    cert.validity.notAfter = addDaysToCurrentDate(validityPeriodDays)

    const autoIdSan = `autoid:auto:${Buffer.from(autoId).toString('hex')}`
    let sanExtensionFound = false

    // Check for existing SAN extension
    const extensions = csr.getAttribute({ name: 'extensionRequest' })?.extensions
    if (extensions) {
      for (const ext of extensions) {
        if (ext.name === 'subjectAltName') {
          sanExtensionFound = true
          ext.altNames = ext.altNames || [] // Ensure altNames is initialized
          ext.altNames.push({
            type: 6, // URI
            value: autoIdSan,
          })
          break
        }
      }
    }

    // If no existing SAN extension, create one
    if (!sanExtensionFound) {
      cert.setExtensions([
        ...cert.extensions,
        {
          name: 'subjectAltName',
          altNames: [{ type: 6, value: autoIdSan }],
        },
      ])
    }

    // Copy all extensions from the CSR to the certificate
    if (extensions) {
      cert.setExtensions([...cert.extensions, ...extensions])
    }

    // Sign the certificate with private key
    cert.sign(forge.pki.privateKeyFromPem(keyToPem(privateKey)), forge.md.sha256.create())

    return cert
  }

  /**
   * Issues a self-signed certificate for the identity.
   *
   * @param subjectName Subject name for the certificate(common name).
   * @param validityPeriodDays Number of days the certificate is valid. Defaults to 365.
   * @returns Created X.509 certificate.
   */
  selfIssueCertificate(
    subjectName: string,
    validityPeriodDays: number = 365,
  ): forge.pki.Certificate {
    if (!this.privateKey) {
      throw new Error('Private key is not set.')
    }
    const csr = this.signCSR(this.createCSR(subjectName))
    const certificate = this.issueCertificate(csr, validityPeriodDays)

    this.certificate = certificate
    return this.certificate
  }

  saveCertificate(filePath: string): void {
    const certificate = this.certificate
    if (!certificate) {
      throw new Error('No certificate available to save.')
    }
    const certificatePem = CertificateManager.certificateToPem(certificate)
    fs.writeFileSync(filePath, certificatePem, 'utf8')
  }
}

export default CertificateManager
